import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [jumpToFreqBin, setJumpToFreqBin] = useState<string>("");
  const [windowStart, setWindowStart] = useState(0);
  
  // Windowed view settings
  const INITIAL_LOAD_COUNT = 16;
  const WINDOW_SIZE = 17; // center item + 8 before + 8 after
  const BUFFER_SIZE = 8;

  const scrollToFrequencyBin = (binIndex: number) => {
    if (!scrollContainerRef.current) return;
    
    // Each frequency bin card is 288px wide (w-72 = 18rem = 288px) + 12px gap
    const cardWidth = 288 + 12;
    const scrollPosition = binIndex * cardWidth;
    
    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  };

  const handleJumpToFreqBin = () => {
    const binNum = parseInt(jumpToFreqBin);
    if (!isNaN(binNum) && binNum >= 0 && binNum < sampleWindow) {
      // If we have more than INITIAL_LOAD_COUNT items, use windowed view
      if (dftResults.length > INITIAL_LOAD_COUNT) {
        // Center the target index: 7 before + target + 8 after = 16 total
        const beforeCount = 7;
        const newWindowStart = Math.max(0, Math.min(binNum - beforeCount, dftResults.length - INITIAL_LOAD_COUNT));
        setWindowStart(newWindowStart);
      } else {
        scrollToFrequencyBin(binNum);
      }
      onSelectFrequencyBin(binNum); // Also select the frequency bin
    }
    setJumpToFreqBin(""); // Clear input after jump
  };

  // Calculate which items to render based on windowed view
  const getVisibleItems = () => {
    if (dftResults.length <= INITIAL_LOAD_COUNT) {
      // Show all items if we have 16 or fewer
      return dftResults;
    } else {
      // Show windowed view (16 items total)
      const windowEnd = Math.min(windowStart + INITIAL_LOAD_COUNT, dftResults.length);
      return dftResults.slice(windowStart, windowEnd);
    }
  };

  const visibleItems = getVisibleItems();
  const isWindowedView = dftResults.length > INITIAL_LOAD_COUNT;

  useEffect(() => {
    // Don't update canvases when paused (frozen)
    if (!isPlaying) return;
    
    visibleItems.forEach((result, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size with device pixel ratio for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = 280;
      const displayHeight = 40;
      
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

      // Draw complex number visualization
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const scale = 15;

      // Draw axes
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(displayWidth, centerY);
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, displayHeight);
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
  }, [visibleItems, isPlaying, selectedFrequencyBin, sampleWindow]);

  return (
    <div className="bg-surface border-r border-gray-700 p-4 flex flex-col h-full md:h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-primary">Summation Results</h2>
        <div className="text-xs text-text-secondary font-mono">
          {viewMode === "vector" ? "X[k] = Σ x[n]W^kn" : "Frequency projections"}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 max-h-full">
        <div ref={scrollContainerRef} className="scroll-container h-full max-h-full overflow-x-auto overflow-y-hidden pb-1">
          <div className="flex gap-3" style={{ minHeight: 'min-content' }}>
            {(visibleItems.length > 0 ? visibleItems : Array.from({ length: Math.min(sampleWindow, INITIAL_LOAD_COUNT) }, (_, k) => ({
              real: 0,
              imag: 0,
              magnitude: 0,
              phase: 0
            }))).map((result, k) => {
              // For windowed view, calculate the actual index
              const actualK = isWindowedView ? windowStart + k : k;
              return (
              <div
                key={actualK}
                className={`bg-dark rounded-lg p-3 border-2 cursor-pointer hover:bg-gray-900 transition-colors flex-shrink-0 w-72 ${
                  selectedFrequencyBin === actualK ? 'border-primary' : 'border-gray-700'
                }`}
                onClick={() => onSelectFrequencyBin(actualK)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-mono font-bold ${
                    selectedFrequencyBin === actualK ? 'text-primary' : 'text-accent'
                  }`}>
                    X[{actualK}]
                  </span>
                  {selectedFrequencyBin === actualK && (
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
            );
            })}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3 text-xs text-text-secondary text-center">
        {/* Windowed view indicator */}
        {isWindowedView && (
          <div className="bg-blue-900/30 border border-blue-600/50 rounded px-3 py-2 text-xs text-blue-200 mb-2">
            Windowed view: Showing {visibleItems.length} of {dftResults.length} items (Bins {windowStart}-{windowStart + visibleItems.length - 1})
          </div>
        )}
        
        <div className="flex items-center justify-center gap-2 mb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newBin = Math.max(0, selectedFrequencyBin - 1);
              scrollToFrequencyBin(newBin);
              onSelectFrequencyBin(newBin);
            }}
            disabled={selectedFrequencyBin <= 0}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <div className="flex items-center gap-1">
            <span>X[</span>
            <Input
              type="number"
              value={jumpToFreqBin}
              onChange={(e) => setJumpToFreqBin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJumpToFreqBin();
                }
              }}
              onBlur={() => {
                if (jumpToFreqBin.trim() === '') {
                  setJumpToFreqBin(''); // Keep empty instead of defaulting
                } else {
                  handleJumpToFreqBin();
                }
              }}
              min="0"
              max={sampleWindow - 1}
              placeholder="Enter bin #"
              className="w-12 h-6 text-xs bg-gray-800 border-gray-600 text-white text-center px-1"
            />
            <span>]</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newBin = Math.min(sampleWindow - 1, selectedFrequencyBin + 1);
              scrollToFrequencyBin(newBin);
              onSelectFrequencyBin(newBin);
            }}
            disabled={selectedFrequencyBin >= sampleWindow - 1}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div>
          <span>Click to select frequency bin • {sampleWindow} bins total</span>
        </div>
      </div>
    </div>
  );
}
