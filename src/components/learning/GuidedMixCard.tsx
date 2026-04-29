interface GuidedMixCardProps {
  stepInfo: {
    title: string;
    body: string;
    actionPrompt: string;
    highlightTarget: string | null;
    countdown: number | null;
    urgency: 'normal' | 'soon' | 'now';
  };
  stepNumber: number;
  totalSteps: number;
  onDismiss: () => void;
}

export function GuidedMixCard({ stepInfo, stepNumber, totalSteps, onDismiss }: GuidedMixCardProps) {
  const progressPercent = (stepNumber / totalSteps) * 100;

  const borderColor =
    stepInfo.urgency === 'now' ? 'border-red-400/50' :
    stepInfo.urgency === 'soon' ? 'border-yellow-400/30' :
    'border-accent/20';

  const bgGradient =
    stepInfo.urgency === 'now' ? 'from-red-500/10 to-red-500/5' :
    stepInfo.urgency === 'soon' ? 'from-yellow-500/10 to-yellow-500/5' :
    'from-accent/10 to-accent-dim/5';

  const progressBarColor =
    stepInfo.urgency === 'now' ? 'bg-red-400' :
    stepInfo.urgency === 'soon' ? 'bg-yellow-400' :
    'bg-accent';

  return (
    <div className={`relative bg-gradient-to-r ${bgGradient} rounded-xl border ${borderColor} overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {/* Progress bar */}
      <div className="h-1 bg-bg-secondary">
        <div
          className={`h-full ${progressBarColor} transition-all duration-500 ease-out`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-4 flex items-center gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                Step {stepNumber} of {totalSteps}
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip Guide
            </button>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-text-primary mb-1">
            {stepInfo.title}
          </h3>

          {/* Body */}
          <p className="text-xs text-text-secondary leading-relaxed mb-2">
            {stepInfo.body}
          </p>

          {/* Action prompt */}
          {stepInfo.actionPrompt && (
            <div className={`flex items-center gap-2 text-xs font-medium ${
              stepInfo.urgency === 'now' ? 'text-red-400' :
              stepInfo.urgency === 'soon' ? 'text-yellow-400' :
              'text-accent'
            }`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {stepInfo.actionPrompt}
            </div>
          )}
        </div>

        {/* Countdown display */}
        {stepInfo.countdown !== null && (
          <div className="shrink-0 flex flex-col items-center justify-center">
            <span
              key={stepInfo.countdown}
              className={`text-4xl font-black tabular-nums leading-none animate-in zoom-in-50 duration-150 ${
                stepInfo.urgency === 'now' ? 'text-red-400' :
                stepInfo.urgency === 'soon' ? 'text-yellow-400' :
                'text-accent'
              }`}
            >
              {stepInfo.countdown}
            </span>
            <span className="text-[9px] text-text-muted mt-1 uppercase tracking-wider">sec</span>
          </div>
        )}
      </div>
    </div>
  );
}
