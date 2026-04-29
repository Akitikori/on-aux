import { getMonoData } from './decode';

interface BpmDebug {
  subBassPhase: number;
  broadbandPhase: number;
  energyPhase: number;
  histKickPhase: number;
  candidateA: number;
  candidateB: number;
  distA: number;
  distB: number;
}

interface BpmResult {
  bpm: number;
  confidence: number;
  beatPhase: number;
  bpmDebug: BpmDebug;
}

export async function detectBPM(buffer: AudioBuffer): Promise<BpmResult> {
  const data = getMonoData(buffer);
  const sampleRate = buffer.sampleRate;

  // Downsample to ~4kHz for faster processing
  const downsampleFactor = Math.floor(sampleRate / 4000);
  const downsampled = new Float32Array(Math.floor(data.length / downsampleFactor));
  for (let i = 0; i < downsampled.length; i++) {
    downsampled[i] = data[i * downsampleFactor];
  }
  const dsRate = sampleRate / downsampleFactor;

  // Apply onset detection: compute energy difference
  const windowSize = Math.floor(dsRate * 0.05); // 50ms windows
  const hopSize = Math.floor(windowSize / 2);
  const numFrames = Math.floor((downsampled.length - windowSize) / hopSize);
  const energy = new Float32Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    const offset = i * hopSize;
    for (let j = 0; j < windowSize; j++) {
      sum += downsampled[offset + j] ** 2;
    }
    energy[i] = sum / windowSize;
  }

  // Onset detection function (first-order difference, half-wave rectified)
  const onset = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    onset[i] = Math.max(0, energy[i] - energy[i - 1]);
  }

  // Autocorrelation of onset function
  // Search BPM range: 60-180 BPM
  const minBPM = 60;
  const maxBPM = 180;
  const framesPerSecond = dsRate / hopSize;
  const minLag = Math.floor(framesPerSecond * 60 / maxBPM);
  const maxLag = Math.floor(framesPerSecond * 60 / minBPM);

  let bestLag = minLag;
  let bestCorr = -Infinity;
  const correlations = new Float32Array(maxLag - minLag + 1);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let count = 0;
    for (let i = 0; i < onset.length - lag; i++) {
      corr += onset[i] * onset[i + lag];
      count++;
    }
    corr /= count || 1;
    correlations[lag - minLag] = corr;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  // Parabolic interpolation around the autocorrelation peak for sub-frame precision.
  // At 105 BPM (lag=23 frames), integer lag quantisation can cause up to ±2.2 BPM
  // error which drifts ~1 beat per minute. Interpolation reduces this to <0.1 BPM.
  let preciseLag: number = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const y0 = correlations[bestLag - 1 - minLag];
    const y1 = correlations[bestLag - minLag];
    const y2 = correlations[bestLag + 1 - minLag];
    const denom = y0 - 2 * y1 + y2;
    if (denom < 0) {
      preciseLag = bestLag - 0.5 * (y0 - y2) / denom;
    }
  }

  // Compute confidence: ratio of best peak to mean
  let meanCorr = 0;
  for (let i = 0; i < correlations.length; i++) {
    meanCorr += correlations[i];
  }
  meanCorr /= correlations.length;
  const confidence = meanCorr > 0 ? Math.min(1, bestCorr / (meanCorr * 3)) : 0.5;

  // Initial BPM estimate from interpolated lag (still has ~0.3 BPM error at 40fps).
  let roughBPM = framesPerSecond * 60 / preciseLag;
  if (roughBPM < 70) roughBPM *= 2;
  if (roughBPM > 170) roughBPM /= 2;

  // 3:2 harmonic check — Amapiano and half-time tracks have a dominant log drum at
  // ~75 BPM while the actual groove runs at ~112 BPM (a 3:2 ratio). If the autocorrelation
  // at the ×3/2 lag is also strong (> 35% of the detected peak), the faster tempo is
  // the real rhythmic pulse and we should use it instead.
  if (roughBPM >= 70 && roughBPM < 90) {
    const candidateFaster = roughBPM * 1.5;
    if (candidateFaster <= 175) {
      const candidateLag = framesPerSecond * 60 / candidateFaster;
      const lagIdx = Math.round(candidateLag) - minLag;
      if (lagIdx >= 0 && lagIdx < correlations.length && correlations[lagIdx] > bestCorr * 0.35) {
        roughBPM = candidateFaster;
      }
    }
  }

  // Comb filter refinement: search ±2 BPM around roughBPM at 0.02 BPM steps.
  // For each candidate BPM, sum onset values at every predicted beat position using
  // linear interpolation between frames (fractional-lag comb filter). The BPM with
  // the highest score is the most temporally consistent with the actual onsets.
  let finalBPM = roughBPM;
  let bestCombScore = -Infinity;
  const combStep = 0.02;
  for (let testBPM = roughBPM - 2; testBPM <= roughBPM + 2; testBPM += combStep) {
    const testLag = framesPerSecond * 60 / testBPM;
    let score = 0;
    for (let k = 1; k * testLag < numFrames; k++) {
      const pos = k * testLag;
      const lo = Math.floor(pos);
      const frac = pos - lo;
      if (lo + 1 < numFrames) {
        score += (1 - frac) * onset[lo] + frac * onset[lo + 1];
      }
    }
    if (score > bestCombScore) {
      bestCombScore = score;
      finalBPM = testBPM;
    }
  }

  // --- Beat phase detection using true sub-bass content ---
  //
  // Downsample to ~300Hz using AVERAGING (box-car LP filter).
  // Averaging N samples is a perfect anti-aliasing LP filter: the first null
  // lands exactly at the output Nyquist (150Hz). This means only 0–150Hz content
  // reaches the phase detector — kick drums (50–120Hz) without any snare/hi-hat
  // aliasing that would corrupt a simple-decimation approach.
  const kickFactor = Math.max(1, Math.floor(sampleRate / 300));
  const kickLen = Math.floor(data.length / kickFactor);
  const kickData = new Float32Array(kickLen);
  for (let i = 0; i < kickLen; i++) {
    let s = 0;
    const base = i * kickFactor;
    for (let j = 0; j < kickFactor; j++) s += data[base + j];
    kickData[i] = s / kickFactor;
  }
  const kickRate = sampleRate / kickFactor; // ~300Hz

  // Energy and onset at kick resolution (50ms windows, 25ms hop)
  const kWin = Math.max(2, Math.floor(kickRate * 0.05));
  const kHop = Math.floor(kWin / 2);
  const kFrames = Math.floor((kickLen - kWin) / kHop);
  const kickEnergy = new Float32Array(kFrames);
  for (let i = 0; i < kFrames; i++) {
    let s = 0;
    const off = i * kHop;
    for (let j = 0; j < kWin; j++) s += kickData[off + j] ** 2;
    kickEnergy[i] = s / kWin;
  }
  const kickOnset = new Float32Array(kFrames);
  for (let i = 1; i < kFrames; i++) {
    kickOnset[i] = Math.max(0, kickEnergy[i] - kickEnergy[i - 1]);
  }
  const kHopSec = kHop / kickRate;

  // Sub-bass beat-level comb filter — finds phase within one beat period where
  // kick energy is most concentrated.
  const kFPS = kickRate / kHop;

  // 4:3 cross-rhythm check using sub-bass phase histogram "peakiness" (max / mean).
  //
  // Why autocorrelation fails here: Afrobeats cross-rhythms produce 4 equally-weighted
  // onsets per 3 felt beats, giving a spuriously strong autocorrelation peak at 4/3× the
  // true tempo (e.g. 133 BPM detected for a 100 BPM groove). A simple correlation
  // threshold cannot distinguish this from a genuine 133 BPM track.
  //
  // Why peakiness works: build the sub-bass comb phase histogram (sum kickOnset at each
  // phase slot) for both finalBPM and finalBPM×3/4.
  //  • Genuine 133 BPM → all kicks land in the SAME slot → max ≫ mean → high peakiness.
  //  • Afrobeats 100 BPM (133 BPM is 4:3 artefact) → 100 BPM kicks are incommensurate
  //    with the 133 BPM slot grid, so energy spreads uniformly across all slots →
  //    max ≈ mean → peakiness ≈ 1. The 100 BPM comb concentrates those same kicks and
  //    wins with higher peakiness.
  if (finalBPM >= 115 && finalBPM <= 155) {
    const altBPM = finalBPM * 0.75; // candidate felt beat
    if (altBPM >= 85 && altBPM <= 117) {
      const kickPeakiness = (bpm: number): number => {
        const lag = Math.max(1, Math.round(kFPS * 60 / bpm));
        const sums = new Float32Array(lag);
        for (let p = 0; p < lag; p++) {
          for (let j = p; j < kickOnset.length; j += lag) sums[p] += kickOnset[j];
        }
        let maxS = 0, totalS = 0;
        for (let p = 0; p < lag; p++) {
          if (sums[p] > maxS) maxS = sums[p];
          totalS += sums[p];
        }
        const meanS = totalS / lag;
        return meanS > 0 ? maxS / meanS : 1;
      };

      if (kickPeakiness(altBPM) > kickPeakiness(finalBPM)) {
        // Re-run comb filter at the slower BPM for a precise value
        let altFinalBPM = altBPM;
        let bestAltScore = -Infinity;
        for (let testBPM = altBPM - 2; testBPM <= altBPM + 2; testBPM += combStep) {
          const testLag = framesPerSecond * 60 / testBPM;
          let score = 0;
          for (let k = 1; k * testLag < numFrames; k++) {
            const pos = k * testLag;
            const lo = Math.floor(pos);
            const frac = pos - lo;
            if (lo + 1 < numFrames) score += (1 - frac) * onset[lo] + frac * onset[lo + 1];
          }
          if (score > bestAltScore) { bestAltScore = score; altFinalBPM = testBPM; }
        }
        finalBPM = altFinalBPM;
      }
    }
  }

  const kPhaseLag = Math.max(1, Math.round(kFPS * 60 / finalBPM));
  const phaseSums = new Float32Array(kPhaseLag);
  for (let p = 0; p < kPhaseLag; p++) {
    for (let j = p; j < kickOnset.length; j += kPhaseLag) {
      phaseSums[p] += kickOnset[j];
    }
  }
  let bestPhaseIdx = 0, maxPhaseSum = 0;
  for (let p = 0; p < kPhaseLag; p++) {
    if (phaseSums[p] > maxPhaseSum) { maxPhaseSum = phaseSums[p]; bestPhaseIdx = p; }
  }
  const subBassPhase = bestPhaseIdx * kHopSec;

  // Full-bandwidth fine-grained onset for beat phase detection.
  //
  // The BPM autocorrelation runs on 4kHz downsampled audio (0–2kHz), which strips
  // hi-hats, snares, and cymbals (4–16kHz). For Amapiano, the log drum dominates
  // the 0–2kHz band and has a slow attack that causes the comb filter phase to land
  // ~100–170ms late. The same 12ms/6ms windows on the FULL sample rate audio includes
  // the complete frequency spectrum — hi-hats and claps provide sharp, precisely-timed
  // transients that give an accurate beat phase even when the low-frequency content lags.
  // Temporal resolution is identical (fineFPS ≈ 167fps regardless of sample rate)
  // because fineWin/fineHop both scale proportionally with sampleRate.
  const fineWin = Math.max(4, Math.floor(sampleRate * 0.012)); // ~12ms at full rate
  const fineHop = Math.max(2, Math.floor(fineWin / 2));        // ~6ms
  const fineFrames = Math.floor((data.length - fineWin) / fineHop);
  const fineEnergy = new Float32Array(fineFrames);
  for (let i = 0; i < fineFrames; i++) {
    let sum = 0;
    const off = i * fineHop;
    for (let j = 0; j < fineWin; j++) sum += data[off + j] ** 2;
    fineEnergy[i] = sum / fineWin;
  }
  const fineOnset = new Float32Array(fineFrames);
  for (let i = 1; i < fineFrames; i++) {
    fineOnset[i] = Math.max(0, fineEnergy[i] - fineEnergy[i - 1]);
  }
  const fineFPS = sampleRate / fineHop;
  const fineHopSec = fineHop / sampleRate;

  // Broadband beat-level comb filter on the fine-grained onset.
  // For syncopated genres (Afrobeats, Amapiano) the loudest sub-bass transient isn't
  // always where humans perceive the beat. The broadband signal captures snares, claps,
  // and melodic hits which often define the felt pulse more clearly.
  const bPhaseLag = Math.max(1, Math.round(fineFPS * 60 / finalBPM));
  const bPhaseSums = new Float32Array(bPhaseLag);
  for (let p = 0; p < bPhaseLag; p++) {
    for (let j = p; j < fineOnset.length; j += bPhaseLag) {
      bPhaseSums[p] += fineOnset[j];
    }
  }
  let bestBroadIdx = 0, maxBroadSum = 0;
  for (let p = 0; p < bPhaseLag; p++) {
    if (bPhaseSums[p] > maxBroadSum) { maxBroadSum = bPhaseSums[p]; bestBroadIdx = p; }
  }
  const broadbandPhase = bestBroadIdx * fineHopSec;

  // Score both candidates by summing fine-grained broadband onset energy at predicted
  // beat positions. The winner is the phase that best aligns with the full rhythmic texture.
  const scorePhase = (phase: number): number => {
    const beatDur = 60 / finalBPM;
    const totalSec = fineOnset.length * fineHopSec;
    let score = 0;
    for (let k = 0; k * beatDur < totalSec; k++) {
      const t = phase + k * beatDur;
      const frame = t / fineHopSec;
      const lo = Math.floor(frame);
      const frac = frame - lo;
      if (lo + 1 < fineOnset.length) score += (1 - frac) * fineOnset[lo] + frac * fineOnset[lo + 1];
    }
    return score;
  };

  const subBassScore = scorePhase(subBassPhase);
  const broadbandScore = scorePhase(broadbandPhase);
  const energyPhase = broadbandScore > subBassScore ? broadbandPhase : subBassPhase;

  // Half-beat ambiguity resolution using sub-bass dominance ratio.
  // In Afrobeats/syncopated genres, the off-beat often has a louder broadband hit
  // (snare/clap) while the on-beat kick is more sub-bass dominant.
  // We score both phase candidates using the RATIO of sub-bass onset energy to
  // broadband onset energy — the true kick (on-beat) should score higher here.
  const beatDur = 60 / finalBPM;
  const halfBeatSec = beatDur / 2;
  const candidateA = energyPhase;
  const candidateB = energyPhase + halfBeatSec < beatDur
    ? energyPhase + halfBeatSec
    : energyPhase - halfBeatSec;

  // Half-beat disambiguation via threshold-based kick-peak histogram.
  //
  // Problem: the comb filter sums ALL sub-bass energy, which includes sustained bass
  // notes that can be louder than kick transients in Afrobeats/Amapiano. This causes
  // it to lock onto the wrong half-beat when the bass riff peaks at the off-beat.
  //
  // Solution: build a phase histogram using only STRONG kick peaks (above mean+1σ).
  // These peaks correspond to actual kick drum attacks rather than sustained bass energy.
  // The histogram bin with the most total peak energy within one beat period is the
  // most likely beat position.
  let kickMean = 0;
  for (let i = 0; i < kickOnset.length; i++) kickMean += kickOnset[i];
  kickMean /= kickOnset.length;
  let kickSumSq = 0;
  for (let i = 0; i < kickOnset.length; i++) kickSumSq += (kickOnset[i] - kickMean) ** 2;
  const kickStd = Math.sqrt(kickSumSq / kickOnset.length);
  const kickThresh = kickMean + kickStd; // top ~16% of frames

  const numPhaseBins = 32;
  const phaseHistogram = new Float32Array(numPhaseBins);
  for (let i = 0; i < kickOnset.length; i++) {
    if (kickOnset[i] > kickThresh) {
      const t = i * kHopSec;
      const phase = ((t % beatDur) + beatDur) % beatDur;
      const bin = Math.floor((phase / beatDur) * numPhaseBins) % numPhaseBins;
      phaseHistogram[bin] += kickOnset[i] - kickThresh; // excess above threshold
    }
  }

  // Circular smoothing (3-bin triangular kernel) to handle quantisation noise
  const smoothHist = new Float32Array(numPhaseBins);
  for (let b = 0; b < numPhaseBins; b++) {
    smoothHist[b] = 0.5 * phaseHistogram[b]
      + 0.25 * phaseHistogram[(b - 1 + numPhaseBins) % numPhaseBins]
      + 0.25 * phaseHistogram[(b + 1) % numPhaseBins];
  }
  let peakBin = 0;
  for (let b = 1; b < numPhaseBins; b++) {
    if (smoothHist[b] > smoothHist[peakBin]) peakBin = b;
  }
  const histKickPhase = ((peakBin + 0.5) / numPhaseBins) * beatDur;

  // Wrap-aware distance: shortest arc within one beat period
  const wrapDist = (a: number, b: number): number =>
    Math.abs(((a - b + beatDur / 2 + beatDur) % beatDur) - beatDur / 2);

  const distA = wrapDist(candidateA, histKickPhase);
  const distB = wrapDist(candidateB, histKickPhase);
  // If histogram peak is ambiguous (both candidates equidistant), keep energyPhase
  const beatPhase = distB < distA - 0.01 ? candidateB : candidateA;

  console.debug(
    `[BPM] bpm=${finalBPM.toFixed(3)}` +
    ` subBassPhase=${subBassPhase.toFixed(3)}s broadbandPhase=${broadbandPhase.toFixed(3)}s` +
    ` energyPhase=${energyPhase.toFixed(3)}s histKickPhase=${histKickPhase.toFixed(3)}s` +
    ` candidateA=${candidateA.toFixed(3)}s candidateB=${candidateB.toFixed(3)}s` +
    ` distA=${distA.toFixed(3)} distB=${distB.toFixed(3)} finalPhase=${beatPhase.toFixed(3)}s`
  );

  return {
    bpm: finalBPM,
    confidence: Math.round(confidence * 100) / 100,
    beatPhase,
    bpmDebug: { subBassPhase, broadbandPhase, energyPhase, histKickPhase, candidateA, candidateB, distA, distB },
  };
}
