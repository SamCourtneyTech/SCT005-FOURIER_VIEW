import { useEffect, useRef } from "react";

interface DFTResult {
  real: number;
  imag: number;
  magnitude: number;
  phase: number;
}

interface SummationSectionProps {
  dftResults: DFTResult[];
  selectedFrequencyBin: number;
  onSelectFrequencyBin: (bin: number) => void;
  sampleWindow: number;
  isPlaying?: boolean;
  viewMode: "vector" | "projection";
}

export function SummationSection({
  dftResults,
  selectedFrequencyBin,
  onSelectFrequencyBin,
  sampleWindow,
  isPlaying = true,
  viewMode,
}: SummationSectionProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const visibleResults = dftResults.slice(0, Math.min(64, sampleWindow));
    visibleResults.forEach((result, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 280;
      canvas.height = 40;

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

      // Draw complex number visualization
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = 15;

      // Draw axes
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, canvas.height);
      ctx.stroke();

      // Draw complex number vector
      ctx.strokeStyle = index === selectedFrequencyBin ? '#1976D2' : '#FF5722';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + result.real * scale,
        centerY - result.imag * scale
      );
      ctx.stroke();

      // Draw magnitude circle
      ctx.strokeStyle = index === selectedFrequencyBin ? '#1976D2' : '#FF5722';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, result.magnitude * scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw point at the end
      ctx.fillStyle = index === selectedFrequencyBin ? '#1976D2' : '#FF5722';
      ctx.beginPath();
      ctx.arc(
        centerX + result.real * scale,
        centerY - result.imag * scale,
        3,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  }, [dftResults, selectedFrequencyBin, sampleWindow]);

  return (
    <div className="bg-surface border-r border-gray-700 p-4 flex flex-col h-full md:h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-primary">Summation Results</h2>
        <div className="text-xs text-text-secondary font-mono">
          {viewMode === "vector" ? "X[k] = Σ x[n]W^kn" : "Frequency projections"}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 max-h-full">
        <div className="scroll-container h-full max-h-full overflow-x-auto overflow-y-hidden pb-1">
          <div className="flex gap-3" style={{ minHeight: 'min-content' }}>
            {(dftResults.length > 0 ? dftResults.slice(0, Math.min(2048, sampleWindow)) : Array.from({ length: sampleWindow }, (_, k) => ({
              real: 0,
              imag: 0,
              magnitude: 0,
              phase: 0
            }))).map((result, k) => (
              <div
                key={k}
                className={`bg-dark rounded-lg p-3 border-2 cursor-pointer hover:bg-gray-900 transition-colors flex-shrink-0 w-72 ${
                  selectedFrequencyBin === k ? 'border-primary' : 'border-gray-700'
                }`}
                onClick={() => onSelectFrequencyBin(k)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-mono font-bold ${
                    selectedFrequencyBin === k ? 'text-primary' : 'text-accent'
                  }`}>
                    X[{k}]
                  </span>
                  {selectedFrequencyBin === k && (
                    <span className="text-xs text-success">Selected</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-text-secondary font-mono">
                    <span>Real: </span>
                    <span className="text-white">{result.real.toFixed(3)}</span>
                  </div>
                  <div className="text-xs text-text-secondary font-mono">
                    <span>Imag: </span>
                    <span className="text-white">{result.imag.toFixed(3)}</span>
                  </div>
                  <div className="text-xs text-text-secondary font-mono">
                    <span>Mag: </span>
                    <span className="text-accent">{result.magnitude.toFixed(3)}</span>
                  </div>
                  <div className="text-xs text-text-secondary font-mono">
                    <span>Phase: </span>
                    <span className="text-warning">{result.phase.toFixed(1)}°</span>
                  </div>
                </div>
                <canvas
                  ref={(el) => (canvasRefs.current[k] = el)}
                  width="280"
                  height="40"
                  className="w-full visualization-canvas rounded mt-2"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 text-xs text-text-secondary text-center">
        Click to select frequency bin • <span>{sampleWindow}</span> bins total
      </div>
    </div>
  );
}
