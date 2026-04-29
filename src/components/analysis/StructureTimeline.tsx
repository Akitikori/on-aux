import type { StructureSegment } from '../../types/track';
import { segmentColors } from '../../utils/colors';
import { formatTime } from '../../utils/formatTime';

interface StructureTimelineProps {
  segments: StructureSegment[];
  duration: number;
}

export function StructureTimeline({ segments, duration }: StructureTimelineProps) {
  if (segments.length === 0 || duration === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Song Structure</h3>
      <div className="flex rounded-lg overflow-hidden h-8">
        {segments.map((segment, i) => {
          const width = ((segment.endTime - segment.startTime) / duration) * 100;
          const colors = segmentColors[segment.type];
          return (
            <div
              key={i}
              className="relative group flex items-center justify-center text-[10px] font-medium transition-opacity hover:opacity-90"
              style={{
                width: `${width}%`,
                backgroundColor: colors?.bg ?? 'rgba(100,100,120,0.15)',
                borderRight: i < segments.length - 1 ? '1px solid rgba(0,0,0,0.3)' : undefined,
                color: colors?.text ?? '#9898a8',
              }}
              title={`${segment.label}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
            >
              {width > 8 && segment.label}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                <div className="font-medium">{segment.label}</div>
                <div className="text-text-secondary">{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-3 flex-wrap">
        {(['intro', 'buildup', 'chorus', 'breakdown', 'outro'] as const).map(type => {
          const hasType = segments.some(s => s.type === type);
          if (!hasType) return null;
          const colors = segmentColors[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors?.text }} />
              <span className="text-[11px] text-text-secondary capitalize">{type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
