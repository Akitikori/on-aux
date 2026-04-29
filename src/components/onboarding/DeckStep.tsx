import { useState } from 'react';
import { WaveformDeck } from '../waveform/WaveformDeck';
import type { Track, AnalysisResult } from '../../types/track';
import { tipCatalog } from '../../content/tips';

interface DeckStepProps {
  track: Track;
  blob: Blob;
  analysis: AnalysisResult;
  onComplete: () => void;
  onPositionChange?: (position: number) => void;
  onDismissTip?: (tipId: string) => void;
  dismissedTips?: string[];
}

export function DeckStep({
  track,
  blob,
  analysis,
  onComplete,
  onPositionChange,
  onDismissTip,
  dismissedTips = [],
}: DeckStepProps) {
  const [showTour, setShowTour] = useState(true);
  const generalTips = tipCatalog.general ?? [];

  return (
    <div className="px-6 py-4 max-w-4xl mx-auto w-full">
      {/* Tour overlay */}
      {showTour && (
        <div className="mb-6 bg-gradient-to-r from-accent/10 to-accent-dim/5 rounded-xl p-5 border border-accent/20">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Your track is ready!
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            Below is your waveform — a visual map of your song. The colored sections show different parts
            (intro, chorus, outro, etc.). Hit play and watch how the music moves through each section.
            We'll show you tips as you go.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {generalTips.map(tip => (
              <div key={tip.id} className="bg-bg-card/60 rounded-lg px-3 py-2 text-xs text-text-secondary max-w-xs">
                <span className="font-medium text-text-primary">{tip.title}:</span> {tip.body}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowTour(false)}
            className="text-sm text-accent hover:text-accent-light transition-colors font-medium"
          >
            Got it, let me explore
          </button>
        </div>
      )}

      <WaveformDeck
        track={track}
        blob={blob}
        analysis={analysis}
        onPositionChange={onPositionChange}
        onDismissTip={onDismissTip}
        dismissedTips={dismissedTips}
        showLearning={true}
      />

      <div className="mt-6 flex justify-center">
        <button
          onClick={onComplete}
          className="px-6 py-2.5 bg-accent hover:bg-accent-light text-white font-medium rounded-xl transition-colors text-sm"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
