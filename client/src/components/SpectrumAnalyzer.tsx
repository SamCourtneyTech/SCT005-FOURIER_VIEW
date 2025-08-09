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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      const gridSpacing = canvas.width / sampleWindow;
      
      // Draw vertical grid lines for each frequency bin
      for (let i = 0; i <= sampleWindow; i++) {
        const x = i * gridSpacing;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Draw horizontal grid lines
      for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw frequency bin labels (k values)
      ctx.fillStyle = '#666';
      ctx.font = '10px Roboto Mono';
      ctx.textAlign = 'center';
      for (let i = 0; i < sampleWindow; i++) {
        const x = (i + 0.5) * gridSpacing;
        ctx.fillText(`k=${i}`, x, canvas.height - 25);
      }

      // Draw frequency range labels under k values
      ctx.fillStyle = '#888';
      ctx.font = '8px Roboto Mono';
      const frequencyRanges = ['20Hz', '100Hz', '1kHz', '10kHz', '20kHz'];
      const maxDisplayRanges = Math.min(sampleWindow, frequencyRanges.length);
      
      for (let i = 0; i < maxDisplayRanges; i++) {
        const x = (i + 0.5) * gridSpacing;
        ctx.fillText(frequencyRanges[i], x, canvas.height - 5);
      }

      // Draw DFT results as frequency spectrum
      if (dftResults && dftResults.length >= sampleWindow) {
        ctx.fillStyle = '#FF5722';
        const barWidth = gridSpacing * 0.8; // Leave some spacing between bars
        
        for (let i = 0; i < sampleWindow; i++) {
          const magnitude = dftResults[i]?.magnitude || 0;
          const maxMagnitude = Math.max(...dftResults.slice(0, sampleWindow).map(r => r.magnitude));
          const normalizedMagnitude = maxMagnitude > 0 ? magnitude / maxMagnitude : 0;
          
          const x = i * gridSpacing + (gridSpacing - barWidth) / 2;
          const barHeight = normalizedMagnitude * (canvas.height - 35); // Leave space for labels
          
          ctx.fillRect(x, canvas.height - 35 - barHeight, barWidth, barHeight);
          
          // Draw magnitude values
          ctx.fillStyle = '#AAA';
          ctx.font = '8px Roboto Mono';
          ctx.textAlign = 'center';
          ctx.fillText(magnitude.toFixed(2), x + barWidth/2, canvas.height - 40 - barHeight);
          ctx.fillStyle = '#FF5722';
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
    <div className="bg-surface p-4 flex flex-col h-full md:h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary">Frequency Domain</h2>
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

      <div className="flex-1 bg-dark rounded-lg p-3 border border-gray-700 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full visualization-canvas rounded"
        />
      </div>

      <div className="mt-3 space-y-2">
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
