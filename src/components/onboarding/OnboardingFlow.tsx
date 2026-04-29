import { useState, useCallback } from 'react';
import { WelcomeStep } from './WelcomeStep';
import { UploadStep } from './UploadStep';
import { AnalyzingStep } from './AnalyzingStep';
import { DeckStep } from './DeckStep';
import type { Track, AnalysisResult } from '../../types/track';

interface OnboardingFlowProps {
  onComplete: () => void;
  onTrackUploaded: (track: Track, blob: Blob) => void;
  onAnalysisComplete: (analysis: AnalysisResult) => void;
  uploadedTrack: { track: Track; blob: Blob } | null;
  analysis: AnalysisResult | null;
  analysisStatus: string;
  analysisProgress: number;
  onPositionChange?: (position: number) => void;
  onDismissTip?: (tipId: string) => void;
  dismissedTips?: string[];
}

type OnboardingStep = 'welcome' | 'upload' | 'analyzing' | 'deck';

export function OnboardingFlow({
  onComplete,
  onTrackUploaded,
  onAnalysisComplete: _onAnalysisComplete,
  uploadedTrack,
  analysis,
  analysisStatus,
  analysisProgress,
  onPositionChange,
  onDismissTip,
  dismissedTips = [],
}: OnboardingFlowProps) {
  void _onAnalysisComplete;
  const [step, setStep] = useState<OnboardingStep>('welcome');

  const handleFileSelected = useCallback((_file: File) => {
    // Parent handles the upload logic — we just move to analyzing
    setStep('analyzing');
  }, []);

  const handleAnalysisReady = useCallback(() => {
    setStep('deck');
  }, []);

  // Auto-advance when analysis completes
  if (step === 'analyzing' && analysis) {
    handleAnalysisReady();
  }

  switch (step) {
    case 'welcome':
      return <WelcomeStep onContinue={() => setStep('upload')} />;
    case 'upload':
      return (
        <UploadStep
          onFileSelected={(file) => {
            handleFileSelected(file);
            // Trigger the parent to handle upload + analysis
            const processFile = async () => {
              const audioCtx = new AudioContext();
              const arrayBuf = await file.arrayBuffer();
              const blob = new Blob([arrayBuf], { type: file.type });
              let duration: number;
              try {
                const buffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
                duration = buffer.duration;
              } finally {
                await audioCtx.close();
              }
              const track: Track = {
                id: crypto.randomUUID(),
                name: file.name.replace(/\.(mp3|wav)$/i, ''),
                fileName: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
                duration,
                addedAt: Date.now(),
              };
              onTrackUploaded(track, blob);
            };
            processFile();
          }}
        />
      );
    case 'analyzing':
      return (
        <AnalyzingStep
          status={analysisStatus}
          progress={analysisProgress}
          trackName={uploadedTrack?.track.name}
        />
      );
    case 'deck':
      if (!uploadedTrack || !analysis) return null;
      return (
        <DeckStep
          track={uploadedTrack.track}
          blob={uploadedTrack.blob}
          analysis={analysis}
          onComplete={onComplete}
          onPositionChange={onPositionChange}
          onDismissTip={onDismissTip}
          dismissedTips={dismissedTips}
        />
      );
  }
}
