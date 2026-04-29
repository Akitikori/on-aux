import type { AnalysisResult } from '../../types/track';
import { getTransitionSuggestions } from '../../audio/recommendations';
import { formatTime } from '../../utils/formatTime';

interface TransitionGuideProps {
  analysis: AnalysisResult;
}

export function TransitionGuide({ analysis }: TransitionGuideProps) {
  const suggestions = getTransitionSuggestions(analysis);

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
        Transition Points
      </h3>
      <div className="space-y-3">
        {suggestions.map((suggestion, i) => (
          <div key={i} className="flex gap-3">
            <div className="shrink-0 w-16 text-right">
              <span className="text-sm font-mono text-accent font-medium">
                {formatTime(suggestion.mixPoint)}
              </span>
            </div>
            <div className="border-l border-accent/30 pl-3">
              <p className="text-sm font-medium text-text-primary">{suggestion.style}</p>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{suggestion.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
