import type { LearningTip } from '../../types/tips';
import { segmentColors } from '../../utils/colors';

interface TipOverlayProps {
  tip: LearningTip;
  onDismiss: () => void;
}

export function TipOverlay({ tip, onDismiss }: TipOverlayProps) {
  const colors = tip.segmentType ? segmentColors[tip.segmentType] : null;

  return (
    <div
      className="rounded-xl p-4 border transition-all animate-in fade-in slide-in-from-bottom-2"
      style={{
        backgroundColor: colors?.bg ?? 'rgba(139, 92, 246, 0.1)',
        borderColor: colors?.border ?? 'rgba(139, 92, 246, 0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors?.text ?? '#8b5cf6'} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">{tip.title}</h4>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">{tip.body}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
