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

      // Draw n markings on x-axis - show quarter/center/3-quarter for larger windows
      ctx.fillStyle = '#666';
      ctx.font = '10px Roboto Mono';
      ctx.textAlign = 'center';
      
      if (sampleWindow <= 8) {
        // Show all n values for small windows
        for (let i = 0; i < sampleWindow; i++) {
          const x = (i + 0.5) * gridSpacing;
          ctx.fillText(`n=${i}`, x, canvas.height - 5);
        }
      } else {
        // Show quarter, center, 3-quarter for larger windows
        const quarter = Math.floor(sampleWindow / 4);
        const center = Math.floor(sampleWindow / 2);
        const threeQuarter = Math.floor((3 * sampleWindow) / 4);
        
        const positions = [0, quarter, center, threeQuarter, sampleWindow - 1];
        positions.forEach(i => {
          const x = (i + 0.5) * gridSpacing;
          ctx.fillText(`n=${i}`, x, canvas.height - 5);
        });
      }

      // Draw y-axis magnitude labels
      ctx.textAlign = 'right';
      ctx.fillStyle = '#666';
      ctx.font = '10px Roboto Mono';
      ctx.fillText('1.0', 15, 15);
      ctx.fillText('0.5', 15, canvas.height / 4 + 5);
      ctx.fillText('0.0', 15, canvas.height / 2 + 5);
      ctx.fillText('-0.5', 15, (3 * canvas.height) / 4 + 5);
      ctx.fillText('-1.0', 15, canvas.height - 5);
      
      // Draw "Magnitude" label on y-axis
      ctx.save();
      ctx.translate(10, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#888';
      ctx.font = '12px Roboto';
      ctx.fillText('Magnitude', 0, 0);
      ctx.restore();

      // Draw center line at y=0
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Draw waveform using timeData scaled to sample window with bars from center
      if (timeData && timeData.length >= sampleWindow) {
        const sliceWidth = canvas.width / sampleWindow;
        const centerY = canvas.height / 2;
        const barWidth = sliceWidth * 0.8; // Leave some spacing between bars

        for (let i = 0; i < sampleWindow; i++) {
          const amplitude = timeData[i] || 0;
          // Scale amplitude to canvas coordinates (-1 to 1 maps to full height)
          const barHeight = (amplitude * centerY);
          
          const x = i * sliceWidth + (sliceWidth - barWidth) / 2;
          
          // Draw bars extending from center
          ctx.fillStyle = '#1976D2';
          if (barHeight >= 0) {
            // Positive amplitude - bar goes up from center
            ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
          } else {
            // Negative amplitude - bar goes down from center
            ctx.fillRect(x, centerY, barWidth, -barHeight);
          }

          // Draw sample points at the tip of each bar
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, centerY - barHeight, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
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
  }, [analyserNode, isPlaying, sampleWindow, timeData]);

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
