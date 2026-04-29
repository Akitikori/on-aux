import { getMonoData } from './decode';

export function computeEnergyCurve(buffer: AudioBuffer, windowMs: number = 100): number[] {
  const data = getMonoData(buffer);
  const sampleRate = buffer.sampleRate;
  const windowSamples = Math.floor(sampleRate * windowMs / 1000);
  const hopSamples = Math.floor(windowSamples / 2);
  const numFrames = Math.floor((data.length - windowSamples) / hopSamples);

  const energy: number[] = [];

  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    const offset = i * hopSamples;
    for (let j = 0; j < windowSamples; j++) {
      sum += data[offset + j] ** 2;
    }
    energy.push(Math.sqrt(sum / windowSamples)); // RMS
  }

  // Normalize to 0-1
  const maxEnergy = Math.max(...energy, 0.0001);
  return energy.map(e => e / maxEnergy);
}

export function smoothEnergyCurve(curve: number[], windowSize: number = 20): number[] {
  const smoothed: number[] = [];
  for (let i = 0; i < curve.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(curve.length - 1, i + windowSize); j++) {
      sum += curve[j];
      count++;
    }
    smoothed.push(sum / count);
  }
  return smoothed;
}
