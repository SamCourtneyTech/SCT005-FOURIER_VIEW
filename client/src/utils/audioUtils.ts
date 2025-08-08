// Audio utility functions for processing and analysis

// Convert audio buffer to Float32Array
export function bufferToFloat32Array(buffer: AudioBuffer, channel = 0): Float32Array {
  return buffer.getChannelData(channel);
}

// Apply window function (Hamming window)
export function applyHammingWindow(data: Float32Array): Float32Array {
  const N = data.length;
  const windowed = new Float32Array(N);
  
  for (let n = 0; n < N; n++) {
    const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
    windowed[n] = data[n] * window;
  }
  
  return windowed;
}

// Apply window function (Hann window)
export function applyHannWindow(data: Float32Array): Float32Array {
  const N = data.length;
  const windowed = new Float32Array(N);
  
  for (let n = 0; n < N; n++) {
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
    windowed[n] = data[n] * window;
  }
  
  return windowed;
}

// Calculate RMS (Root Mean Square) of audio data
export function calculateRMS(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

// Convert RMS to dB
export function rmsToDb(rms: number): number {
  return 20 * Math.log10(rms + 1e-10); // Add small value to avoid log(0)
}

// Find peak frequency from frequency domain data
export function findPeakFrequency(frequencyData: Uint8Array, sampleRate: number): number {
  let maxIndex = 0;
  let maxValue = 0;
  
  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxValue) {
      maxValue = frequencyData[i];
      maxIndex = i;
    }
  }
  
  const nyquist = sampleRate / 2;
  return (maxIndex / frequencyData.length) * nyquist;
}

// Extract a window of samples from audio data
export function extractWindow(data: Float32Array, startIndex: number, windowSize: number): Float32Array {
  const window = new Float32Array(windowSize);
  
  for (let i = 0; i < windowSize; i++) {
    const index = startIndex + i;
    window[i] = index < data.length ? data[index] : 0;
  }
  
  return window;
}

// Normalize audio data to [-1, 1] range
export function normalizeAudio(data: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > max) max = abs;
  }
  
  if (max === 0) return data;
  
  const normalized = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    normalized[i] = data[i] / max;
  }
  
  return normalized;
}

// Generate a test sine wave
export function generateSineWave(
  frequency: number,
  sampleRate: number,
  duration: number,
  amplitude = 1.0
): Float32Array {
  const length = Math.floor(sampleRate * duration);
  const data = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
  }
  
  return data;
}

// Format frequency for display
export function formatFrequency(freq: number): string {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(1)}k`;
  }
  return `${freq.toFixed(0)}`;
}

// Format time for display
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
