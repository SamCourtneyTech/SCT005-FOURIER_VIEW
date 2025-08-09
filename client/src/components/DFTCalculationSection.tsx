import { useEffect, useRef } from "react";

interface DFTCalculationSectionProps {
  sampleWindow: number;
  selectedFrequencyBin: number;
  timeData: Float32Array | null;
  twiddleFactors: { real: number; imag: number; amplitude: number; result: { real: number; imag: number } }[];
  currentSample: number;
  isPlaying?: boolean;
  viewMode: "vector" | "projection";
}

export function DFTCalculationSection({
  sampleWindow,
  selectedFrequencyBin,
  timeData,
  twiddleFactors,
  currentSample,
  isPlaying = true,
  viewMode,
}: DFTCalculationSectionProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    twiddleFactors.forEach((factor, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 280;
      canvas.height = 60;

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      
      for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw amplitude visualization
      const centerY = canvas.height / 2;
      const amplitude = factor.amplitude;
      const maxAmplitude = 1.0;
      
      // Draw amplitude bar
      ctx.fillStyle = '#1976D2';
      const barHeight = (amplitude / maxAmplitude) * centerY;
      ctx.fillRect(10, centerY - barHeight / 2, 30, barHeight);

      // Draw twiddle factor vector
      const vectorCenterX = 100;
      const vectorScale = 20;
      
      ctx.strokeStyle = '#FF5722';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vectorCenterX, centerY);
      ctx.lineTo(
        vectorCenterX + factor.real * vectorScale,
        centerY - factor.imag * vectorScale
      );
      ctx.stroke();

      // Draw result vector
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vectorCenterX + 60, centerY);
      ctx.lineTo(
        vectorCenterX + 60 + factor.result.real * vectorScale,
        centerY - factor.result.imag * vectorScale
      );
      ctx.stroke();

      // Draw labels
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Roboto Mono';
      ctx.fillText('Amp', 10, canvas.height - 5);
      ctx.fillText('W', vectorCenterX - 10, canvas.height - 5);
      ctx.fillText('Result', vectorCenterX + 50, canvas.height - 5);
    });
  }, [twiddleFactors]);

  return (
    <div className="bg-surface border-r border-gray-700 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary">DFT Internal Calculations</h2>
        <div className="text-xs text-text-secondary font-mono">
          x[n] × W<sub>N</sub><sup>kn</sup>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="scroll-container h-full overflow-x-auto md:overflow-hidden overflow-y-hidden pb-1">
          <div className="flex md:grid md:grid-cols-2 gap-3 md:gap-2 h-full" style={{ minHeight: '200px' }}>
            {twiddleFactors.map((factor, index) => (
              <div key={index} className="bg-dark rounded-lg p-3 border border-gray-700 flex-shrink-0 w-72 md:w-auto">{/*Mobile: horizontal scroll, Desktop: 2-col grid*/}
                <div className="flex flex-col items-center mb-2">
                  <span className="text-sm font-mono text-accent">n = {index}</span>
                  <span className="text-xs text-text-secondary text-center">
                    W₈{selectedFrequencyBin * index} = {factor.real.toFixed(3)} {factor.imag >= 0 ? '+' : ''} {factor.imag.toFixed(3)}i
                  </span>
                </div>
                <canvas
                  ref={(el) => (canvasRefs.current[index] = el)}
                  width="280"
                  height="60"
                  className="w-full visualization-canvas rounded text-xs"
                />
                <div className="flex justify-between mt-2 text-xs text-text-secondary font-mono">
                  <span>Amp: {factor.amplitude.toFixed(3)}</span>
                  <span>
                    {viewMode === "vector" ? (
                      <>Result: {factor.result.real.toFixed(3)} {factor.result.imag >= 0 ? '+' : ''} {factor.result.imag.toFixed(3)}i</>
                    ) : (
                      <>Phase: {((Math.atan2(factor.imag, factor.real) * 180) / Math.PI).toFixed(1)}°</>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-text-secondary text-center">
        <span>Sample {currentSample + 1}</span> of <span>{sampleWindow}</span>
        • <span>k = {selectedFrequencyBin}</span>
      </div>
    </div>
  );
}
