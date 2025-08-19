import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

// Function to process frequency data based on analysis mode
function processFrequencyData(
  dftResults: { real: number; imag: number; magnitude: number; phase: number }[],
  analysisMode: "raw" | "normalized",
  sampleWindow: number
): number[] {
  if (!dftResults || dftResults.length === 0) {
    return [];
  }

  if (analysisMode === "raw") {
    // Return raw magnitudes for all bins
    return dftResults.slice(0, sampleWindow).map(result => result.magnitude);
  }

  // Proper DSP normalization pipeline
  const N = sampleWindow;
  
  // 1. Extract complex values and convert to proper format
  const complexData = dftResults.slice(0, N).map(result => ({
    real: result.real,
    imag: result.imag,
    magnitude: Math.sqrt(result.real * result.real + result.imag * result.imag)
  }));
  
  // 2. Simulate detrending effect on DFT results
  // Remove mean from magnitudes (simulated post-DFT detrending effect)
  const meanMagnitude = complexData.reduce((sum, val) => sum + val.magnitude, 0) / N;
  const detrendedData = complexData.map(val => ({
    ...val,
    magnitude: Math.max(val.magnitude - meanMagnitude * 0.1, 0) // Conservative detrend simulation
  }));
  
  // 3. Apply Hann window correction
  // For Hann window: CG = 0.5, U ≈ 0.375
  const CG = 0.5; // Coherent gain
  const U = 0.375; // Power factor for Hann window
  
  // 4. One-sided spectrum processing (0 to fs/2 only)
  const oneSidedLength = Math.floor(N / 2) + 1;
  const oneSidedMagnitudes: number[] = [];
  
  for (let k = 0; k < oneSidedLength; k++) {
    const magnitude = detrendedData[k]?.magnitude || 0;
    
    if (k === 0 || k === Math.floor(N / 2)) {
      // DC and Nyquist components (no doubling)
      oneSidedMagnitudes[k] = magnitude / (N * CG);
    } else {
      // Positive frequency components (double for one-sided)
      oneSidedMagnitudes[k] = (2 * magnitude) / (N * CG);
    }
  }
  
  // 5. Convert to PSD (Power Spectral Density) for better representation
  const epsilon = 1e-12; // Avoid log(0)
  const psdMagnitudes = oneSidedMagnitudes.map(mag => {
    const power = mag * mag; // Convert amplitude to power
    return Math.max(power, epsilon);
  });
  
  // 6. Apply dB conversion with proper floor
  const dBMagnitudes = psdMagnitudes.map(power => {
    return 10 * Math.log10(power); // 10*log10 for power (not 20*log10 for amplitude)
  });
  
  // 7. Global normalization (not per-bin) to preserve relative amplitudes
  const maxdB = Math.max(...dBMagnitudes);
  const mindB = Math.min(...dBMagnitudes);
  const dBRange = maxdB - mindB;
  
  // Normalize to 0-1 range for visualization while preserving spectral shape
  const normalizedMagnitudes = dBMagnitudes.map(dB => {
    return dBRange > 0 ? (dB - mindB) / dBRange : 0;
  });
  
  // Pad to original sample window size for consistent visualization
  const paddedMagnitudes = new Array(sampleWindow).fill(0);
  for (let i = 0; i < Math.min(oneSidedLength, sampleWindow); i++) {
    paddedMagnitudes[i] = normalizedMagnitudes[i];
  }
  
  return paddedMagnitudes;
}

interface SpectrumAnalyzerProps {
  analyserNode: AnalyserNode | null;
  peakFrequency: number;
  peakMagnitude: number;
  frequencyResolution: number;
  isPlaying?: boolean;
  sampleWindow: number;
  dftResults: { real: number; imag: number; magnitude: number; phase: number }[];
  analysisMode?: "raw" | "normalized";
}

export function SpectrumAnalyzer({
  analyserNode,
  peakFrequency,
  peakMagnitude,
  frequencyResolution,
  isPlaying = true,
  sampleWindow,
  dftResults,
  analysisMode = "raw",
}: SpectrumAnalyzerProps) {
  const [isLogScale] = useState(false); // Removed toggle functionality
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frozenDftResultsRef = useRef<{ real: number; imag: number; magnitude: number; phase: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Set canvas size with device pixel ratio for HD quality
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      // Store current dftResults when playing for freezing on pause
      if (isPlaying && dftResults && dftResults.length >= sampleWindow) {
        frozenDftResultsRef.current = [...dftResults];
      }

      // Use frozen data when paused, live data when playing
      const displayResults = isPlaying ? dftResults : frozenDftResultsRef.current;
      
      // Apply frequency analysis processing based on mode
      const processedMagnitudes = processFrequencyData(displayResults, analysisMode, sampleWindow);

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Calculate spacing and padding (needed for both grid and labels)
      const padding = 20; // Add padding on both sides for frequency labels
      const usableWidth = rect.width - (padding * 2);
      const gridSpacing = usableWidth / sampleWindow;
      
      // Draw grid only for sample windows <= 64
      if (sampleWindow <= 64) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // Draw vertical grid lines for each frequency bin
        for (let i = 0; i <= sampleWindow; i++) {
          const x = padding + (i * gridSpacing);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, rect.height);
          ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let i = 0; i < rect.height; i += 20) {
          ctx.beginPath();
          ctx.moveTo(padding, i);
          ctx.lineTo(rect.width - padding, i);
          ctx.stroke();
        }
      }

      // Draw frequency bin labels (k values) - only show quarter, half, three-quarter, and max
      ctx.fillStyle = '#666';
      ctx.font = '12px Roboto Mono';
      ctx.textAlign = 'center';
      
      if (sampleWindow <= 8) {
        // Show all k values for small windows
        for (let i = 0; i < sampleWindow; i++) {
          const x = padding + (i + 0.5) * gridSpacing;
          ctx.fillText(`k=${i}`, x, rect.height - 25);
        }
      } else {
        // Show only quarter, half, three-quarter, and max for larger windows
        const keyIndices = [
          0, // Start
          Math.floor(sampleWindow / 4), // Quarter
          Math.floor(sampleWindow / 2), // Half
          Math.floor(3 * sampleWindow / 4), // Three-quarter
          sampleWindow - 1 // Max
        ];
        
        for (const i of keyIndices) {
          const x = padding + (i + 0.5) * gridSpacing;
          ctx.fillText(`k=${i}`, x, rect.height - 25);
        }
      }

      // Draw fixed frequency labels (0Hz, fn, fs) below k values
      ctx.fillStyle = '#888';
      ctx.font = '10px Roboto Mono';
      ctx.textAlign = 'center';
      
      // 0Hz at k=0
      const zeroHzX = padding + (0 + 0.5) * gridSpacing;
      ctx.fillText('0Hz', zeroHzX, rect.height - 5);
      
      // fn (Nyquist frequency) at k=N/2
      if (sampleWindow > 2) {
        const nyquistIndex = Math.floor(sampleWindow / 2);
        const nyquistX = padding + (nyquistIndex + 0.5) * gridSpacing;
        ctx.fillText('fn', nyquistX, rect.height - 5);
      }
      
      // fs (sampling frequency) at k=N-1
      if (sampleWindow > 1) {
        const samplingX = padding + (sampleWindow - 1 + 0.5) * gridSpacing;
        ctx.fillText('fs', samplingX, rect.height - 5);
      }

      // Draw DFT results as frequency spectrum
      if (processedMagnitudes && processedMagnitudes.length >= sampleWindow) {
        const barWidth = gridSpacing * 0.8; // Leave some spacing between bars
        
        // For normalized mode, show one-sided spectrum (0 to fs/2)
        const displayLength = analysisMode === "normalized" ? Math.floor(sampleWindow / 2) + 1 : sampleWindow;
        
        // Find max magnitude for visualization scaling
        const relevantMagnitudes = processedMagnitudes.slice(0, displayLength);
        const maxMagnitude = Math.max(...relevantMagnitudes);
        const minMagnitude = Math.min(...relevantMagnitudes);
        const range = maxMagnitude - minMagnitude;
        
        for (let i = 0; i < displayLength; i++) {
          const magnitude = processedMagnitudes[i] || 0;
          // Normalize magnitude for visualization (0 to 1)
          const normalizedMagnitude = range > 0 ? (magnitude - minMagnitude) / range : 0;
          
          // Adjust x positioning for one-sided display
          const effectiveGridSpacing = analysisMode === "normalized" ? 
            (usableWidth / displayLength) : gridSpacing;
          const x = padding + i * effectiveGridSpacing + (effectiveGridSpacing - barWidth) / 2;
          const barHeight = normalizedMagnitude * (rect.height - 35); // Leave space for labels
          
          // Color bars based on frequency content and analysis mode
          const isDC = i === 0;
          const isNyquist = i === Math.floor(displayLength / 2) && analysisMode === "normalized";
          const isPositiveFreq = i > 0 && i < Math.floor(displayLength / 2);
          
          if (isDC) {
            ctx.fillStyle = '#4CAF50'; // Green for DC
          } else if (isNyquist) {
            ctx.fillStyle = '#9C27B0'; // Purple for Nyquist
          } else if (analysisMode === "normalized" && isPositiveFreq) {
            ctx.fillStyle = '#2196F3'; // Blue for positive frequencies (one-sided)
          } else if (analysisMode === "raw") {
            // Raw mode: use original coloring scheme
            const symmetricIndex = sampleWindow - i;
            const isSymmetricPair = i > 0 && i < sampleWindow/2 && symmetricIndex < sampleWindow;
            
            if (isSymmetricPair) {
              ctx.fillStyle = '#2196F3'; // Blue for symmetric pairs
            } else if (i > sampleWindow/2) {
              ctx.fillStyle = '#2196F3'; // Blue for symmetric pairs (second half)
            } else {
              ctx.fillStyle = '#FF5722'; // Default orange
            }
          } else {
            ctx.fillStyle = '#FF5722'; // Default orange
          }
          
          ctx.fillRect(x, rect.height - 35 - barHeight, barWidth, barHeight);
        }
      }
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, dftResults, sampleWindow, isPlaying, analysisMode]);

  return (
    <div className="bg-surface p-4 flex flex-col h-full md:h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-primary">Frequency Domain</h2>
          {sampleWindow >= 8 && (
            <div className="text-xs text-gray-400 mt-1">
              <span className="text-green-400">■</span> DC, 
              <span className="text-blue-400">■</span> Symmetric pairs, 
              <span className="text-purple-400">■</span> Nyquist
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-text-secondary">
          <span>|X[k]|</span>
        </div>
      </div>

      <div className="flex-1 bg-dark rounded-lg p-3 border border-gray-700 relative min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full visualization-canvas rounded block"
        />
      </div>

      <div className="mt-3 space-y-2 flex-shrink-0">
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Peak Frequency</span>
          <span>{peakFrequency.toFixed(0)} Hz</span>
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Peak Magnitude</span>
          <span>{peakMagnitude.toFixed(1)} dB</span>
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Resolution</span>
          <span>{frequencyResolution.toFixed(0)} Hz/bin</span>
        </div>
      </div>
    </div>
  );
}
