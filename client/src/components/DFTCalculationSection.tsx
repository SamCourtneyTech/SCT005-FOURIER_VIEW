import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [jumpToSample, setJumpToSample] = useState<string>("");
  const [windowStart, setWindowStart] = useState(0);
  
  // Windowed view settings
  const INITIAL_LOAD_COUNT = 16;
  const WINDOW_SIZE = 17; // center item + 8 before + 8 after
  const BUFFER_SIZE = 8;

  const scrollToSample = (sampleIndex: number) => {
    if (!scrollContainerRef.current) return;
    
    // Each sample card is 288px wide (w-72 = 18rem = 288px) + 12px gap
    const cardWidth = 288 + 12;
    const scrollPosition = sampleIndex * cardWidth;
    
    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  };

  const handleJumpToSample = () => {
    const sampleNum = parseInt(jumpToSample);
    if (!isNaN(sampleNum) && sampleNum >= 1 && sampleNum <= sampleWindow) {
      const targetIndex = sampleNum - 1; // Convert 1-based to 0-based index
      
      // If we have more than INITIAL_LOAD_COUNT items, use windowed view
      if (twiddleFactors.length > INITIAL_LOAD_COUNT) {
        // Center the target index: 7 before + target + 8 after = 16 total
        const beforeCount = 7;
        const newWindowStart = Math.max(0, Math.min(targetIndex - beforeCount, twiddleFactors.length - INITIAL_LOAD_COUNT));
        setWindowStart(newWindowStart);
      } else {
        scrollToSample(targetIndex);
      }
    }
    setJumpToSample(""); // Clear input after jump
  };

  // Calculate which items to render based on windowed view
  const getVisibleItems = () => {
    if (twiddleFactors.length <= INITIAL_LOAD_COUNT) {
      // Show all items if we have 16 or fewer
      return twiddleFactors;
    } else {
      // Show windowed view (16 items total)
      const windowEnd = Math.min(windowStart + INITIAL_LOAD_COUNT, twiddleFactors.length);
      return twiddleFactors.slice(windowStart, windowEnd);
    }
  };

  const visibleItems = getVisibleItems();
  const isWindowedView = twiddleFactors.length > INITIAL_LOAD_COUNT;

  useEffect(() => {
    // Don't update canvases when paused (frozen)
    if (!isPlaying) return;
    
    visibleItems.forEach((factor, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size with device pixel ratio for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = 280;
      const displayHeight = 80;
      
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
      
      ctx.scale(dpr, dpr);

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < displayWidth; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, displayHeight);
        ctx.stroke();
      }
      
      for (let i = 0; i < displayHeight; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(displayWidth, i);
        ctx.stroke();
      }

      // Draw amplitude visualization
      const centerY = displayHeight / 2;
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
      ctx.fillText('Amp', 10, displayHeight - 5);
      ctx.fillText('W', vectorCenterX - 10, displayHeight - 5);
      ctx.fillText('Result', vectorCenterX + 50, displayHeight - 5);
    });
  }, [visibleItems, isPlaying, selectedFrequencyBin, viewMode]);

  return (
    <div className="bg-surface border-r border-gray-700 p-4 flex flex-col h-full md:h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-primary">DFT Internal Calculations</h2>
        <div className="text-xs text-text-secondary font-mono">
          x[n] × W<sub>N</sub><sup>kn</sup>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 max-h-full">
        <div ref={scrollContainerRef} className="scroll-container h-full max-h-full overflow-x-auto overflow-y-hidden pb-1">
          <div className="flex gap-3" style={{ minHeight: 'min-content' }}>
            {(visibleItems.length > 0 ? visibleItems : Array.from({ length: Math.min(sampleWindow, INITIAL_LOAD_COUNT) }, (_, index) => ({
              real: 0,
              imag: 0,
              amplitude: 0,
              result: { real: 0, imag: 0 }
            }))).map((factor, index) => {
              // For windowed view, calculate the actual index
              const actualIndex = isWindowedView ? windowStart + index : index;
              return (
              <div key={actualIndex} className="bg-dark rounded-lg p-3 border border-gray-700 flex-shrink-0 w-72">{/* Consistent horizontal scroll for all screen sizes */}
                <div className="flex flex-col items-center mb-2">
                  <span className="text-sm font-mono text-accent">n = {actualIndex}</span>
                  <span className="text-xs text-text-secondary text-center">
                    W₈{selectedFrequencyBin * actualIndex} = {factor.real.toFixed(3)} {factor.imag >= 0 ? '+' : ''} {factor.imag.toFixed(3)}i
                  </span>
                </div>
                <canvas
                  ref={(el) => (canvasRefs.current[index] = el)}
                  width="280"
                  height="80"
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
            );
            })}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 text-xs text-text-secondary text-center flex-shrink-0">
        {/* Windowed view indicator */}
        {isWindowedView && (
          <div className="bg-blue-900/30 border border-blue-600/50 rounded px-3 py-2 text-xs text-blue-200 mb-2">
            (Samples {visibleItems.length} of {twiddleFactors.length})
          </div>
        )}
        
        <div className="flex items-center justify-center gap-2 mb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollToSample(Math.max(0, currentSample - 1))}
            disabled={currentSample <= 0}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <div className="flex items-center gap-1">
            <span>Sample</span>
            <Input
              type="number"
              value={jumpToSample}
              onChange={(e) => setJumpToSample(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJumpToSample();
                }
              }}
              onBlur={() => {
                if (jumpToSample.trim() === '') {
                  setJumpToSample(''); // Keep empty instead of defaulting
                } else {
                  handleJumpToSample();
                }
              }}
              min="1"
              max={sampleWindow}
              placeholder="i"
              className="w-12 h-6 text-xs bg-gray-800 border-gray-600 text-white text-center px-1"
            />
            <span>of {sampleWindow}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollToSample(Math.min(sampleWindow - 1, currentSample + 1))}
            disabled={currentSample >= sampleWindow - 1}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div>
          <span>k = {selectedFrequencyBin}</span>
        </div>
      </div>
    </div>
  );
}
