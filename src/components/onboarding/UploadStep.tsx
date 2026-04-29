import { UploadZone } from '../upload/UploadZone';

interface UploadStepProps {
  onFileSelected: (file: File) => void;
}

export function UploadStep({ onFileSelected }: UploadStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <h2 className="text-2xl font-bold text-text-primary mb-2">
        Upload your first track
      </h2>
      <p className="text-text-secondary mb-8 max-w-md text-center">
        Pick a song you know well — it's easier to learn when you recognize the structure.
      </p>

      <div className="w-full max-w-lg">
        <UploadZone onFileSelected={onFileSelected} />
      </div>

      <p className="text-xs text-text-muted mt-6 max-w-sm text-center">
        Supports MP3 and WAV files up to 50MB. Your music stays on your device — nothing is uploaded to any server.
      </p>
    </div>
  );
}
