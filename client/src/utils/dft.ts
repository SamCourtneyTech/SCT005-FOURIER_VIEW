// Complex number interface
export interface Complex {
  real: number;
  imag: number;
}

// Calculate the twiddle factor W_N^(kn) = e^(-2πi*k*n/N)
export function getTwiddleFactor(N: number, k: number, n: number): Complex {
  const angle = -2 * Math.PI * k * n / N;
  return {
    real: Math.cos(angle),
    imag: Math.sin(angle),
  };
}

// Calculate DFT for a specific frequency bin k
export function calculateDFT(signal: Float32Array, k: number, maxN?: number): Complex {
  const N = maxN || signal.length;
  let real = 0;
  let imag = 0;

  // Optimize calculations by pre-computing the base angle
  const baseAngle = -2 * Math.PI * k / N;
  
  for (let n = 0; n < Math.min(N, signal.length); n++) {
    const angle = baseAngle * n;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    
    real += signal[n] * cosAngle;
    imag += signal[n] * sinAngle;
  }

  return { real, imag };
}

// Calculate full DFT for all frequency bins
export function calculateFullDFT(signal: Float32Array): Complex[] {
  const N = signal.length;
  const result: Complex[] = [];

  for (let k = 0; k < N; k++) {
    result.push(calculateDFT(signal, k));
  }

  return result;
}

// Convert complex number to magnitude
export function getMagnitude(complex: Complex): number {
  return Math.sqrt(complex.real * complex.real + complex.imag * complex.imag);
}

// Convert complex number to phase (in degrees)
export function getPhase(complex: Complex): number {
  return Math.atan2(complex.imag, complex.real) * (180 / Math.PI);
}

// Normalize DFT result by N
export function normalizeDFT(dftResult: Complex[]): Complex[] {
  const N = dftResult.length;
  return dftResult.map(({ real, imag }) => ({
    real: real / N,
    imag: imag / N,
  }));
}

// Apply Hann window to reduce spectral leakage
// Hann window: w[n] = 0.5 * (1 - cos(2π*n/(N-1)))
export function applyHannWindow(signal: Float32Array): Float32Array {
  const N = signal.length;
  const windowed = new Float32Array(N);

  for (let n = 0; n < N; n++) {
    const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
    windowed[n] = signal[n] * windowValue;
  }

  return windowed;
}
