import { useState, useEffect, useRef } from 'react';
import type { AnalysisResult } from '../../types/track';

interface BeatHighlighterProps {
  analysis: AnalysisResult | null | undefined;
  currentTime: number;
}

export function BeatHighlighter({ analysis, currentTime }: BeatHighlighterProps) {
  const [showPhraseBanner, setShowPhraseBanner] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPhraseBarRef = useRef<number>(-1);

  const hasAnalysis = !!analysis && analysis.bpm > 0;

  // Derive beat position from current time
  const beatInfo = (() => {
    if (!hasAnalysis || currentTime <= 0) return null;
    const beatDuration = 60 / analysis!.bpm;
    const beatPhase = analysis!.beatPhase ?? 0;
    const rawIndex = (currentTime - beatPhase) / beatDuration;
    if (rawIndex < 0) return null;
    const beatIndex = Math.floor(rawIndex);
    const beatInBar = beatIndex % 4; // 0 = downbeat
    const barIndex = Math.floor(beatIndex / 4);
    return { beatInBar, barIndex };
  })();

  // Show "New phrase" banner every 8 bars on the downbeat
  useEffect(() => {
    if (!beatInfo) return;
    const { beatInBar, barIndex } = beatInfo;
    if (beatInBar === 0 && barIndex % 8 === 0 && barIndex !== lastPhraseBarRef.current && barIndex > 0) {
      lastPhraseBarRef.current = barIndex;
      setShowPhraseBanner(true);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setShowPhraseBanner(false), 1500);
    }
  }, [beatInfo?.barIndex, beatInfo?.beatInBar]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  if (!hasAnalysis) {
    return (
      <div className="rounded-xl border border-border bg-bg-card/50 p-6 text-center">
        <p className="text-sm font-medium text-text-primary mb-1">Beat Highlighter</p>
        <p className="text-xs text-text-muted">Load and play a track to see the beat count</p>
      </div>
    );
  }

  const beatInBar = beatInfo?.beatInBar ?? 0;

  return (
    <div className="rounded-xl border border-border bg-bg-card/50 p-4 space-y-3">
      {/* "New phrase" banner */}
      <div className={`text-center text-xs font-semibold tracking-widest uppercase transition-opacity duration-300 ${
        showPhraseBanner ? 'text-buildup opacity-100' : 'opacity-0'
      }`}>
        New phrase
      </div>

      {/* 1 2 3 4 beat display */}
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map((beat) => {
          const isActive = beatInfo !== null && beatInBar === beat;
          const isDownbeat = beat === 0;
          return (
            <div
              key={beat}
              className={`flex items-center justify-center rounded-xl font-black tabular-nums transition-all duration-75 ${
                isActive
                  ? isDownbeat
                    ? 'w-20 h-20 text-4xl bg-buildup/20 text-buildup scale-110 shadow-lg shadow-buildup/20'
                    : 'w-16 h-16 text-3xl bg-accent/15 text-accent scale-105'
                  : 'w-14 h-14 text-2xl bg-bg-secondary text-text-muted'
              }`}
            >
              {beat + 1}
            </div>
          );
        })}
      </div>

      {/* Bar counter */}
      {beatInfo && (
        <p className="text-center text-[10px] text-text-muted tabular-nums">
          Bar {beatInfo.barIndex + 1}
        </p>
      )}
    </div>
  );
}
