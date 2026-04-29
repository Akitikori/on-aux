import type { AnalysisResult } from '../../types/track';
import { getNextTrackRecommendation } from '../../audio/recommendations';

interface NextTrackSuggestionProps {
  analysis: AnalysisResult;
}

export function NextTrackSuggestion({ analysis }: NextTrackSuggestionProps) {
  const rec = getNextTrackRecommendation(analysis);

  return (
    <div className="bg-gradient-to-br from-accent/10 to-accent-dim/5 rounded-xl p-4 border border-accent/20">
      <h3 className="text-xs font-medium text-accent uppercase tracking-wider mb-2">
        Next Track Suggestion
      </h3>
      <p className="text-sm text-text-primary leading-relaxed">{rec.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {rec.tips.map((tip, i) => (
          <span
            key={i}
            className="inline-block text-xs bg-bg-card/50 text-text-secondary rounded-lg px-2.5 py-1.5 leading-tight"
          >
            {tip}
          </span>
        ))}
      </div>
    </div>
  );
}
