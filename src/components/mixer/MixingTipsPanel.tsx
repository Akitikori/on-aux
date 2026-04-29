import type { LearningTip } from '../../types/tips';
import { TipOverlay } from '../learning/TipOverlay';

interface MixingTipsPanelProps {
  tip: LearningTip | null;
  onDismiss: (tipId: string) => void;
}

export function MixingTipsPanel({ tip, onDismiss }: MixingTipsPanelProps) {
  if (!tip) return null;

  return (
    <TipOverlay
      tip={tip}
      onDismiss={() => onDismiss(tip.id)}
    />
  );
}
