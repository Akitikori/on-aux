import { UploadProgress } from '../upload/UploadProgress';

interface AnalyzingStepProps {
  status: string;
  progress: number;
  trackName?: string;
}

export function AnalyzingStep({ status, progress, trackName }: AnalyzingStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <h2 className="text-2xl font-bold text-text-primary mb-2">
        Analyzing your track
      </h2>
      <p className="text-text-secondary mb-8">
        Hang tight — we're detecting BPM and mapping the song structure.
      </p>
      <UploadProgress status={status} progress={progress} trackName={trackName} />
    </div>
  );
}
