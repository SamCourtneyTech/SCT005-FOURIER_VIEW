import { useEffect, useRef } from "react";

interface TimeDomainSectionProps {
  analyserNode: AnalyserNode | null;
  currentAmplitude: number;
  dominantFreq: number;
  sampleRate: number;
  isPlaying?: boolean;
  sampleWindow: number;
  timeData: Float32Array | null;
}

export function TimeDomainSection({
  analyserNode,
  currentAmplitude,
  dominantFreq,
  sampleRate,
  isPlaying = true,
  sampleWindow,
  timeData,
}: TimeDomainSectionProps) {
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
      
      // Draw vertical grid lines for each sample (n markings)
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

      // Draw n markings on x-axis
      ctx.fillStyle = '#666';
      ctx.font = '10px Roboto Mono';
      ctx.textAlign = 'center';
      for (let i = 0; i < sampleWindow; i++) {
        const x = (i + 0.5) * gridSpacing;
        ctx.fillText(`n=${i}`, x, canvas.height - 5);
      }

      // Draw waveform using timeData scaled to sample window
      if (timeData && timeData.length >= sampleWindow) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1976D2';
        ctx.beginPath();

        const sliceWidth = canvas.width / sampleWindow;
        let x = 0;

        for (let i = 0; i < sampleWindow; i++) {
          const amplitude = timeData[i] || 0;
          const normalizedAmplitude = (amplitude + 1) / 2; // Convert from -1,1 to 0,1
          const y = canvas.height - (normalizedAmplitude * canvas.height);

          if (i === 0) {
            ctx.moveTo(x + sliceWidth / 2, y);
          } else {
            ctx.lineTo(x + sliceWidth / 2, y);
          }

          // Draw sample points
          ctx.fillStyle = '#1976D2';
          ctx.beginPath();
          ctx.arc(x + sliceWidth / 2, y, 3, 0, 2 * Math.PI);
          ctx.fill();

          x += sliceWidth;
        }

        ctx.stroke();
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isPlaying]);

  return (
    <div className="bg-surface border-r border-gray-700 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary">Time Domain Signal</h2>
        <div className="text-xs text-text-secondary">x(t)</div>
      </div>

      <div className="flex-1 bg-dark rounded-lg p-3 border border-gray-700">
        <canvas
          ref={canvasRef}
          className="w-full h-full visualization-canvas rounded"
        />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Amplitude</span>
          <span>{currentAmplitude.toFixed(1)} dB</span>
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Frequency</span>
          <span>{dominantFreq.toFixed(0)} Hz</span>
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Sample Rate</span>
          <span>{(sampleRate / 1000).toFixed(1)} kHz</span>
        </div>
      </div>
    </div>
  );
}
