import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface SpectrumAnalyzerProps {
  analyserNode: AnalyserNode | null;
  peakFrequency: number;
  peakMagnitude: number;
  frequencyResolution: number;
  isPlaying?: boolean;
  sampleWindow: number;
  dftResults: { real: number; imag: number; magnitude: number; phase: number }[];
}

export function SpectrumAnalyzer({
  analyserNode,
  peakFrequency,
  peakMagnitude,
  frequencyResolution,
  isPlaying = true,
  sampleWindow,
  dftResults,
}: SpectrumAnalyzerProps) {
  const [scalingMode, setScalingMode] = useState<'linear' | 'log' | 'perceptual'>('perceptual');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frozenDftResultsRef = useRef<{ real: number; imag: number; magnitude: number; phase: number }[]>([]);

  // A-weighting approximation for perceptual frequency weighting
  const getAWeighting = (frequency: number): number => {
    const f2 = frequency * frequency;
    const f4 = f2 * f2;
    // Simplified A-weighting formula
    const numerator = 12194 * 12194 * f4;
    const denominator = (f2 + 20.6 * 20.6) * Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) * (f2 + 12194 * 12194);
    return Math.max(0.1, numerator / denominator); // Prevent zero weights
  };

  // Apply different scaling modes to magnitude
  const applyScaling = (magnitude: number, frequency: number, index: number): number => {
    switch (scalingMode) {
      case 'log':
        return magnitude > 0 ? 20 * Math.log10(magnitude + 1e-10) + 100 : 0; // dB scale
      case 'perceptual':
        // Combine logarithmic scaling with A-weighting
        const aWeight = getAWeighting(frequency);
        const logMag = magnitude > 0 ? Math.log10(magnitude + 1e-10) : -10;
        return Math.max(0, (logMag + 10) * aWeight * 50); // Scaled and weighted
      case 'linear':
      default:
        return magnitude;
    }
  };

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

      // Draw DFT results as frequency spectrum with scaling
      if (displayResults && displayResults.length >= sampleWindow) {
        const barWidth = gridSpacing * 0.8; // Leave some spacing between bars
        
        // Calculate frequencies for each bin
        const sampleRate = 44100; // Default, could be passed as prop
        const frequencies = Array.from({length: sampleWindow}, (_, i) => 
          (i * sampleRate) / (2 * sampleWindow)
        );
        
        // Apply scaling to all magnitudes
        const scaledMagnitudes = displayResults.slice(0, sampleWindow).map((result, i) => {
          const magnitude = result?.magnitude || 0;
          const frequency = frequencies[i];
          return applyScaling(magnitude, frequency, i);
        });
        
        // Find max for normalization
        const maxScaledMagnitude = Math.max(...scaledMagnitudes, 1); // Prevent division by zero
        
        for (let i = 0; i < sampleWindow; i++) {
          const scaledMagnitude = scaledMagnitudes[i];
          const normalizedMagnitude = scaledMagnitude / maxScaledMagnitude;
          
          const x = padding + i * gridSpacing + (gridSpacing - barWidth) / 2;
          const barHeight = normalizedMagnitude * (rect.height - 35); // Leave space for labels
          
          // Color bars based on symmetry pairs
          const symmetricIndex = sampleWindow - i;
          const isSymmetricPair = i > 0 && i < sampleWindow/2 && symmetricIndex < sampleWindow;
          const isNyquist = i === sampleWindow/2;
          const isDC = i === 0;
          
          if (isDC) {
            ctx.fillStyle = '#4CAF50'; // Green for DC
          } else if (isNyquist) {
            ctx.fillStyle = '#9C27B0'; // Purple for Nyquist
          } else if (isSymmetricPair) {
            ctx.fillStyle = '#2196F3'; // Blue for symmetric pairs
          } else if (i > sampleWindow/2) {
            ctx.fillStyle = '#2196F3'; // Blue for symmetric pairs (second half)
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
  }, [analyserNode, dftResults, sampleWindow, isPlaying, scalingMode, applyScaling]);

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
        <div className="flex items-center space-x-2">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={scalingMode === 'linear' ? 'default' : 'outline'}
              onClick={() => setScalingMode('linear')}
              className="text-xs h-6 px-2"
            >
              Linear
            </Button>
            <Button
              size="sm"
              variant={scalingMode === 'log' ? 'default' : 'outline'}
              onClick={() => setScalingMode('log')}
              className="text-xs h-6 px-2"
            >
              Log
            </Button>
            <Button
              size="sm"
              variant={scalingMode === 'perceptual' ? 'default' : 'outline'}
              onClick={() => setScalingMode('perceptual')}
              className="text-xs h-6 px-2"
            >
              Perceptual
            </Button>
          </div>
          <span className="text-xs text-text-secondary">|X[k]|</span>
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
