export interface LearningTip {
  id: string;
  title: string;
  body: string;
  segmentType?: 'intro' | 'buildup' | 'chorus' | 'breakdown' | 'outro';
}

export interface TransitionSuggestion {
  id: string;
  title: string;
  description: string;
  startTime: number;
  style: 'fade' | 'eq-swap' | 'echo-out' | 'intro-over-outro';
}
