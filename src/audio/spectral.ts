import { getMonoData } from './decode';

/**
 * Frequency band boundaries in Hz
 */
const BAND_LOW_MAX = 300;   // Kick drums, bass
const BAND_MID_MAX = 4000;  // Vocals, melodies, snares
// Everything above BAND_MID_MAX = high (hi-hats, cymbals)

interface MultiBandEnergy {
  low: number[];   // 20-300 Hz: bass/kick
  mid: number[];   // 300-4000 Hz: vocals/snares
  high: number[];  // 4000+ Hz: hi-hats/cymbals
  total: number[]; // Overall energy
}

/**
 * Compute multi-band energy curves using FFT.
 * Splits audio into frequency bands and computes RMS energy per band per frame.
 */
export function computeMultiBandEnergy(
  buffer: AudioBuffer,
  frameMs: number = 200
): MultiBandEnergy {
  const data = getMonoData(buffer);
  const sampleRate = buffer.sampleRate;
  const frameSamples = Math.floor(sampleRate * frameMs / 1000);
  // Use power-of-2 FFT size closest to frame size
  const fftSize = nextPowerOf2(frameSamples);
  const hopSamples = Math.floor(frameSamples / 2);
  const numFrames = Math.floor((data.length - fftSize) / hopSamples);

  const freqPerBin = sampleRate / fftSize;
  const lowMaxBin = Math.floor(BAND_LOW_MAX / freqPerBin);
  const midMaxBin = Math.floor(BAND_MID_MAX / freqPerBin);
  const nyquistBin = fftSize / 2;

  const low: number[] = [];
  const mid: number[] = [];
  const high: number[] = [];
  const total: number[] = [];

  // Hann window
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
  }

  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * hopSamples;

    // Apply window
    for (let i = 0; i < fftSize; i++) {
      real[i] = (offset + i < data.length ? data[offset + i] : 0) * window[i];
      imag[i] = 0;
    }

    // In-place FFT
    fft(real, imag);

    // Compute magnitude spectrum and band energies
    let lowSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    let lowCount = 0, midCount = 0, highCount = 0;

    for (let bin = 1; bin < nyquistBin; bin++) {
      const mag = Math.sqrt(real[bin] * real[bin] + imag[bin] * imag[bin]);

      if (bin <= lowMaxBin) {
        lowSum += mag * mag;
        lowCount++;
      } else if (bin <= midMaxBin) {
        midSum += mag * mag;
        midCount++;
      } else {
        highSum += mag * mag;
        highCount++;
      }
      totalSum += mag * mag;
    }

    low.push(Math.sqrt(lowSum / Math.max(lowCount, 1)));
    mid.push(Math.sqrt(midSum / Math.max(midCount, 1)));
    high.push(Math.sqrt(highSum / Math.max(highCount, 1)));
    total.push(Math.sqrt(totalSum / Math.max(nyquistBin, 1)));
  }

  // Normalize each band to 0-1
  normalize(low);
  normalize(mid);
  normalize(high);
  normalize(total);

  return { low, mid, high, total };
}

/**
 * Compute spectral novelty function.
 * Measures how much the spectral content changes between consecutive frames.
 * Peaks indicate structural boundaries.
 */
export function computeNoveltyFunction(
  bands: MultiBandEnergy,
  smoothingWindow: number = 8
): number[] {
  const len = bands.low.length;
  const novelty: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    // Compute weighted distance across all bands
    // Bass changes are most important for structure (weighted 2x)
    const lowDiff = Math.abs(bands.low[i] - bands.low[i - 1]);
    const midDiff = Math.abs(bands.mid[i] - bands.mid[i - 1]);
    const highDiff = Math.abs(bands.high[i] - bands.high[i - 1]);

    novelty[i] = lowDiff * 2.0 + midDiff * 1.0 + highDiff * 0.5;
  }

  // Smooth the novelty function
  const smoothed = smoothArray(novelty, smoothingWindow);

  // Normalize
  normalize(smoothed);

  return smoothed;
}

/**
 * Find peaks in the novelty function that represent structural boundaries.
 * Returns peak indices that are above a dynamic threshold.
 */
export function findNoveltyPeaks(
  novelty: number[],
  minSeparationFrames: number = 20,
  threshold: number = 0.3
): number[] {
  const peaks: number[] = [];

  for (let i = 2; i < novelty.length - 2; i++) {
    // Local maximum
    if (
      novelty[i] > novelty[i - 1] &&
      novelty[i] > novelty[i - 2] &&
      novelty[i] > novelty[i + 1] &&
      novelty[i] > novelty[i + 2] &&
      novelty[i] >= threshold
    ) {
      // Check minimum separation from last peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minSeparationFrames) {
        peaks.push(i);
      } else if (novelty[i] > novelty[peaks[peaks.length - 1]]) {
        // Replace the previous peak if this one is stronger
        peaks[peaks.length - 1] = i;
      }
    }
  }

  return peaks;
}

// --- Helpers ---

function normalize(arr: number[]): void {
  const max = Math.max(...arr, 0.0001);
  for (let i = 0; i < arr.length; i++) {
    arr[i] /= max;
  }
}

function smoothArray(arr: number[], windowSize: number): number[] {
  const result: number[] = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(arr.length - 1, i + windowSize); j++) {
      sum += arr[j];
      count++;
    }
    result[i] = sum / count;
  }
  return result;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * In-place Cooley-Tukey FFT.
 * Arrays must be power-of-2 length.
 */
function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;

    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // FFT butterfly
  for (let len = 2; len <= n; len *= 2) {
    const halfLen = len / 2;
    const angle = -2 * Math.PI / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1;
      let curImag = 0;

      for (let j = 0; j < halfLen; j++) {
        const uR = real[i + j];
        const uI = imag[i + j];
        const vR = real[i + j + halfLen] * curReal - imag[i + j + halfLen] * curImag;
        const vI = real[i + j + halfLen] * curImag + imag[i + j + halfLen] * curReal;

        real[i + j] = uR + vR;
        imag[i + j] = uI + vI;
        real[i + j + halfLen] = uR - vR;
        imag[i + j + halfLen] = uI - vI;

        const newCurReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = newCurReal;
      }
    }
  }
}
