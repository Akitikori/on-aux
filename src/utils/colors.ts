export const segmentColors: Record<string, { bg: string; regionBg: string; border: string; text: string }> = {
  intro: {
    bg: 'rgba(59, 130, 246, 0.15)',
    regionBg: 'rgba(0, 0, 0, 0)',
    border: 'rgba(59, 130, 246, 0.5)',
    text: '#3b82f6',
  },
  buildup: {
    bg: 'rgba(245, 158, 11, 0.15)',
    regionBg: 'rgba(0, 0, 0, 0)',
    border: 'rgba(245, 158, 11, 0.5)',
    text: '#f59e0b',
  },
  chorus: {
    bg: 'rgba(239, 68, 68, 0.15)',
    regionBg: 'rgba(0, 0, 0, 0)',
    border: 'rgba(239, 68, 68, 0.5)',
    text: '#ef4444',
  },
  breakdown: {
    bg: 'rgba(139, 92, 246, 0.15)',
    regionBg: 'rgba(0, 0, 0, 0)',
    border: 'rgba(139, 92, 246, 0.5)',
    text: '#8b5cf6',
  },
  outro: {
    bg: 'rgba(16, 185, 129, 0.15)',
    regionBg: 'rgba(0, 0, 0, 0)',
    border: 'rgba(16, 185, 129, 0.5)',
    text: '#10b981',
  },
};

export const segmentColorClasses: Record<string, string> = {
  intro: 'text-intro',
  buildup: 'text-buildup',
  chorus: 'text-chorus',
  breakdown: 'text-breakdown',
  outro: 'text-outro',
};
