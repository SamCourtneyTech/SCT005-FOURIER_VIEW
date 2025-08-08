import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface SpectrumAnalyzerProps {
  analyserNode: AnalyserNode | null;
  peakFrequency: number;
  peakMagnitude: number;
  frequencyResolution: number;
}

export function SpectrumAnalyzer({
  analyserNode,
  peakFrequency,
  peakMagnitude,
  frequencyResolution,
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
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      const gridSpacing = 20;
      
      for (let i = 0; i < canvas.width; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      
      for (let i = 0; i < canvas.height; i += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw spectrum
      const barWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        let barHeight = dataArray[i];
        
        if (isLogScale && barHeight > 0) {
          barHeight = Math.log10(barHeight / 255) * 100 + canvas.height;
        } else {
          barHeight = (barHeight / 255) * canvas.height;
        }

        // Create gradient for spectrum bars
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#1976D2');
        gradient.addColorStop(0.5, '#FF5722');
        gradient.addColorStop(1, '#4CAF50');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isLogScale]);

  return (
    <div className="bg-surface p-4 flex flex-col">
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

        {/* Frequency markers overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs text-text-secondary font-mono pointer-events-none">
          <span>0 Hz</span>
          <span>5.5k</span>
          <span>11k</span>
          <span>16.5k</span>
          <span>22k Hz</span>
        </div>

        {/* Magnitude markers overlay */}
        <div className="absolute top-3 left-3 bottom-3 flex flex-col justify-between text-xs text-text-secondary font-mono pointer-events-none">
          <span>0 dB</span>
          <span>-20</span>
          <span>-40</span>
          <span>-60</span>
          <span>-80 dB</span>
        </div>
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
