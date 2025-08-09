import { useState, useEffect } from "react";
import { calculateDFT, getTwiddleFactor } from "@/utils/dft";

interface DFTResult {
  real: number;
  imag: number;
  magnitude: number;
  phase: number;
}

interface TwiddleFactor {
  real: number;
  imag: number;
  amplitude: number;
  result: { real: number; imag: number };
}

export function useDFTCalculation(
  analyserNode: AnalyserNode | null,
  sampleWindow: number,
  selectedFrequencyBin: number,
  isPlaying: boolean
) {
  const [timeData, setTimeData] = useState<Float32Array | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [dftResults, setDftResults] = useState<DFTResult[]>([]);
  const [twiddleFactors, setTwiddleFactors] = useState<TwiddleFactor[]>([]);
  const [currentSample, setCurrentSample] = useState(0);
  const [frozenData, setFrozenData] = useState<{
    timeData: Float32Array | null;
    dftResults: DFTResult[];
    twiddleFactors: TwiddleFactor[];
  } | null>(null);

  useEffect(() => {
    if (!analyserNode) return;

    const updateDFT = () => {
      // Get time domain data
      const bufferLength = analyserNode.frequencyBinCount;
      const timeArray = new Float32Array(bufferLength);
      const freqArray = new Uint8Array(bufferLength);
      
      analyserNode.getFloatTimeDomainData(timeArray);
      analyserNode.getByteFrequencyData(freqArray);
      
      setTimeData(timeArray);
      setFrequencyData(freqArray);

      // Take a sample window of the specified size
      const windowData = new Float32Array(sampleWindow);
      for (let i = 0; i < sampleWindow; i++) {
        windowData[i] = timeArray[i] || 0;
      }

      // Calculate DFT for frequency bins - limit to prevent lag on large N
      const maxBins = Math.min(sampleWindow, 1024);
      const results: DFTResult[] = [];
      
      for (let k = 0; k < maxBins; k++) {
        const dftValue = calculateDFT(windowData, k, maxBins);
        const magnitude = Math.sqrt(dftValue.real * dftValue.real + dftValue.imag * dftValue.imag);
        const phase = Math.atan2(dftValue.imag, dftValue.real) * (180 / Math.PI);
        
        results.push({
          real: dftValue.real,
          imag: dftValue.imag,
          magnitude,
          phase,
        });
      }
      setDftResults(results);

      // Calculate twiddle factors for the selected frequency bin
      // Optimize for large sample windows by limiting calculations
      const maxFactors = Math.min(sampleWindow, 1024);
      const factors: TwiddleFactor[] = [];
      
      for (let n = 0; n < maxFactors; n++) {
        const amplitude = windowData[n] || 0;
        const twiddle = getTwiddleFactor(sampleWindow, selectedFrequencyBin, n);
        const result = {
          real: amplitude * twiddle.real,
          imag: amplitude * twiddle.imag,
        };
        
        factors.push({
          real: twiddle.real,
          imag: twiddle.imag,
          amplitude: Math.abs(amplitude),
          result,
        });
      }
      setTwiddleFactors(factors);

      // Update current sample for visualization
      setCurrentSample((prev) => (prev + 1) % sampleWindow);

      // Store the latest data for freeze functionality
      if (isPlaying) {
        setFrozenData({
          timeData: new Float32Array(windowData),
          dftResults: [...results],
          twiddleFactors: [...factors],
        });
      }

      // Only continue animation when playing
      if (isPlaying) {
        requestAnimationFrame(updateDFT);
      }
    };

    updateDFT();
  }, [analyserNode, sampleWindow, selectedFrequencyBin, isPlaying, frozenData]);

  // Don't clear frozen data when resuming - keep the last captured state

  // Return frozen data if paused, otherwise return live data
  const currentData = !isPlaying && frozenData ? {
    timeData: frozenData.timeData,
    dftResults: frozenData.dftResults,
    twiddleFactors: frozenData.twiddleFactors,
  } : {
    timeData,
    dftResults,
    twiddleFactors,
  };

  return {
    timeData: currentData.timeData,
    frequencyData,
    dftResults: currentData.dftResults,
    twiddleFactors: currentData.twiddleFactors,
    currentSample,
  };
}
