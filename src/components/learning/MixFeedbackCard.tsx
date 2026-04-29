import type { MixFeedbackResult } from '../../hooks/useMixFeedback';

interface MixFeedbackCardProps {
  feedback: MixFeedbackResult;
  onTryAgain: () => void;
  onDismiss: () => void;
}

const RATING_CONFIG = {
  'seamless': {
    emoji: '🔥',
    label: 'Seamless Mix!',
    color: 'text-green-400',
    bg: 'from-green-500/10',
    border: 'border-green-400/30',
    bar: 'bg-green-400',
  },
  'solid': {
    emoji: '👍',
    label: 'Solid Mix',
    color: 'text-accent',
    bg: 'from-accent/10',
    border: 'border-accent/30',
    bar: 'bg-accent',
  },
  'keep-practicing': {
    emoji: '🎧',
    label: 'Keep Practicing',
    color: 'text-yellow-400',
    bg: 'from-yellow-500/10',
    border: 'border-yellow-400/30',
    bar: 'bg-yellow-400',
  },
} as const;

export function MixFeedbackCard({ feedback, onTryAgain, onDismiss }: MixFeedbackCardProps) {
  const config = RATING_CONFIG[feedback.rating];
  const tips = [feedback.timingTip, feedback.smoothnessTip, feedback.syncTip].filter(
    (t): t is string => t !== null
  );

  return (
    <div
      className={`relative bg-gradient-to-r ${config.bg} to-transparent rounded-xl border ${config.border} overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label={config.label}>{config.emoji}</span>
            <span className={`text-base font-bold ${config.color}`}>{config.label}</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
          >
            Dismiss
          </button>
        </div>

        {/* Score bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">Mix Score</span>
            <span className={`text-sm font-bold tabular-nums ${config.color}`}>{feedback.score}/100</span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${config.bar} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${feedback.score}%` }}
            />
          </div>
        </div>

        {/* Actionable tips */}
        {tips.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  className="mt-0.5 shrink-0 text-text-muted"
                >
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Try Again */}
        <button
          onClick={onTryAgain}
          className="w-full py-1.5 px-3 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-xs font-semibold transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
