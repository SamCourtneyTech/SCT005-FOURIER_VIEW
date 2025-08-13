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
  const [isLogScale, setIsLogScale] = useState(false);
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

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      const gridSpacing = rect.width / sampleWindow;
      
      // Draw vertical grid lines for each frequency bin
      for (let i = 0; i <= sampleWindow; i++) {
        const x = i * gridSpacing;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      
      // Draw horizontal grid lines
      for (let i = 0; i < rect.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(rect.width, i);
        ctx.stroke();
      }

      // Draw frequency bin labels (k values) - only show quarter, half, three-quarter, and max
      ctx.fillStyle = '#666';
      ctx.font = '12px Roboto Mono';
      ctx.textAlign = 'center';
      
      if (sampleWindow <= 8) {
        // Show all k values for small windows
        for (let i = 0; i < sampleWindow; i++) {
          const x = (i + 0.5) * gridSpacing;
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
          const x = (i + 0.5) * gridSpacing;
          ctx.fillText(`k=${i}`, x, rect.height - 25);
        }
      }

      // Draw fixed frequency labels (0Hz, fn, fs) below k values
      ctx.fillStyle = '#888';
      ctx.font = '10px Roboto Mono';
      ctx.textAlign = 'center';
      
      // 0Hz at k=0
      const zeroHzX = (0 + 0.5) * gridSpacing;
      ctx.fillText('0Hz', zeroHzX, rect.height - 5);
      
      // fn (Nyquist frequency) at k=N/2
      if (sampleWindow > 2) {
        const nyquistIndex = Math.floor(sampleWindow / 2);
        const nyquistX = (nyquistIndex + 0.5) * gridSpacing;
        ctx.fillText('fn', nyquistX, rect.height - 5);
      }
      
      // fs (sampling frequency) at k=N-1
      if (sampleWindow > 1) {
        const samplingX = (sampleWindow - 1 + 0.5) * gridSpacing;
        ctx.fillText('fs', samplingX, rect.height - 5);
      }

      // Draw DFT results as frequency spectrum
      if (displayResults && displayResults.length >= sampleWindow) {
        const barWidth = gridSpacing * 0.8; // Leave some spacing between bars
        
        for (let i = 0; i < sampleWindow; i++) {
          const magnitude = displayResults[i]?.magnitude || 0;
          const maxMagnitude = Math.max(...displayResults.slice(0, sampleWindow).map(r => r.magnitude));
          const normalizedMagnitude = maxMagnitude > 0 ? magnitude / maxMagnitude : 0;
          
          const x = i * gridSpacing + (gridSpacing - barWidth) / 2;
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
  }, [analyserNode, dftResults, sampleWindow, isPlaying]);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLogScale(!isLogScale)}
            className={`px-2 py-1 text-xs ${
              isLogScale ? 'bg-gray-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Log Scale
          </Button>
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
