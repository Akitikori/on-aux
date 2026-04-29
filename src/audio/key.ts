import { getMonoData } from './decode';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Kessler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

interface KeyResult {
  key: string;
  keyConfidence: number;
}

function correlate(a: number[], b: number[]): number {
  const n = a.length;
  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) { sumA += a[i]; sumB += b[i]; }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

function rotateArray(arr: number[], shift: number): number[] {
  const n = arr.length;
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = arr[(i + shift) % n];
  }
  return result;
}

export function detectKey(buffer: AudioBuffer): KeyResult {
  const data = getMonoData(buffer);
  const sampleRate = buffer.sampleRate;

  // Downsample to ~4kHz
  const factor = Math.max(1, Math.floor(sampleRate / 4000));
  const dsRate = sampleRate / factor;
  const dsLen = Math.floor(data.length / factor);
  const downsampled = new Float32Array(dsLen);
  for (let i = 0; i < dsLen; i++) {
    downsampled[i] = data[i * factor];
  }

  // Compute chromagram using DFT at specific pitch frequencies
  // We analyze frequencies for pitches C2 to B5 (roughly 65Hz to 988Hz)
  const chroma = new Float64Array(12);
  const windowSize = Math.floor(dsRate * 0.1); // 100ms windows
  const hopSize = Math.floor(windowSize / 2);
  const numFrames = Math.floor((dsLen - windowSize) / hopSize);

  // Reference frequencies for C2 to B5 (4 octaves)
  const C2 = 65.41;

  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * hopSize;

    for (let octave = 0; octave < 4; octave++) {
      for (let note = 0; note < 12; note++) {
        const freq = C2 * Math.pow(2, octave + note / 12);
        if (freq > dsRate / 2) continue; // skip above Nyquist

        // Goertzel algorithm for single-frequency DFT
        const k = freq * windowSize / dsRate;
        const w = 2 * Math.PI * k / windowSize;
        const coeff = 2 * Math.cos(w);

        let s0 = 0, s1 = 0, s2 = 0;
        for (let i = 0; i < windowSize; i++) {
          s0 = downsampled[offset + i] + coeff * s1 - s2;
          s2 = s1;
          s1 = s0;
        }

        const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
        chroma[note] += Math.abs(power);
      }
    }
  }

  // Normalize chroma
  const maxChroma = Math.max(...Array.from(chroma), 0.0001);
  const chromaArray: number[] = [];
  for (let i = 0; i < 12; i++) {
    chromaArray.push(chroma[i] / maxChroma);
  }

  // Correlate with all 24 key profiles (12 major + 12 minor)
  let bestKey = 'C major';
  let bestCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    const majorCorr = correlate(chromaArray, rotateArray(MAJOR_PROFILE, shift));
    if (majorCorr > bestCorr) {
      bestCorr = majorCorr;
      bestKey = `${NOTE_NAMES[shift]} major`;
    }

    const minorCorr = correlate(chromaArray, rotateArray(MINOR_PROFILE, shift));
    if (minorCorr > bestCorr) {
      bestCorr = minorCorr;
      bestKey = `${NOTE_NAMES[shift]} minor`;
    }
  }

  // Confidence: how much better the best match is vs average
  const confidence = Math.max(0, Math.min(1, (bestCorr + 1) / 2));

  return { key: bestKey, keyConfidence: Math.round(confidence * 100) / 100 };
}

// Short display format: "Cm" instead of "C minor", "C" instead of "C major"
export function formatKeyShort(key: string): string {
  if (!key) return '—';
  const parts = key.split(' ');
  if (parts.length !== 2) return key;
  const [note, quality] = parts;
  return quality === 'minor' ? `${note}m` : note;
}
