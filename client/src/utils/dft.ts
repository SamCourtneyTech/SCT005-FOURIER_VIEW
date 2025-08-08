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
export function calculateDFT(signal: Float32Array, k: number): Complex {
  const N = signal.length;
  let real = 0;
  let imag = 0;

  for (let n = 0; n < N; n++) {
    const twiddle = getTwiddleFactor(N, k, n);
    real += signal[n] * twiddle.real;
    imag += signal[n] * twiddle.imag;
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
