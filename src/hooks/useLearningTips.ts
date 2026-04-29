import { useState, useEffect } from 'react';
import { tipCatalog } from '../content/tips';
import type { StructureSegment } from '../types/track';
import type { LearningTip } from '../types/tips';

export function useLearningTips(
  segments: StructureSegment[],
  currentTime: number,
  dismissedTips: string[]
) {
  const [activeTips, setActiveTips] = useState<LearningTip[]>([]);
  const [currentSegment, setCurrentSegment] = useState<StructureSegment | null>(null);

  useEffect(() => {
    const segment = segments.find(
      s => currentTime >= s.startTime && currentTime < s.endTime
    ) ?? null;

    setCurrentSegment(segment);

    if (!segment) {
      // Use functional update to return the same reference when already empty — prevents re-render loop
      setActiveTips(prev => prev.length === 0 ? prev : []);
      return;
    }

    const segmentTips = tipCatalog[segment.type] ?? [];
    const filtered = segmentTips.filter(t => !dismissedTips.includes(t.id));
    const newTip = filtered[0] ?? null;

    // Return stable reference if the tip hasn't changed — prevents re-render loop
    setActiveTips(prev => {
      if (!newTip) return prev.length === 0 ? prev : [];
      if (prev.length === 1 && prev[0] === newTip) return prev;
      return newTip ? [newTip] : [];
    });
  }, [segments, currentTime, dismissedTips]);

  return { activeTips, currentSegment };
}
