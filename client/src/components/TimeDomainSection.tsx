import { useEffect, useRef } from "react";

interface TimeDomainSectionProps {
  analyserNode: AnalyserNode | null;
  currentAmplitude: number;
  dominantFreq: number;
  sampleRate: number;
  isPlaying?: boolean;
}

export function TimeDomainSection({
  analyserNode,
  currentAmplitude,
  dominantFreq,
  sampleRate,
  isPlaying = true,
}: TimeDomainSectionProps) {
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
      analyserNode.getByteTimeDomainData(dataArray);

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

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1976D2';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

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
