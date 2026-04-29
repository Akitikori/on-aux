export interface Track {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  duration: number;
  addedAt: number;
}

export interface StructureSegment {
  type: 'intro' | 'buildup' | 'chorus' | 'breakdown' | 'outro';
  startTime: number;
  endTime: number;
  avgEnergy: number;
  label: string;
}

export interface AnalysisResult {
  trackId: string;
  bpm: number;
  bpmConfidence: number;
  beatPhase?: number;
  bpmDebug?: {
    subBassPhase: number;
    broadbandPhase: number;
    energyPhase: number;
    histKickPhase: number;
    candidateA: number;
    candidateB: number;
    distA: number;
    distB: number;
  };
  key: string;
  keyConfidence: number;
  energyCurve: number[];
  segments: StructureSegment[];
  analyzedAt: number;
}
