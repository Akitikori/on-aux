interface UploadProgressProps {
  status: string;
  progress: number;
  trackName?: string;
}

const statusMessages: Record<string, string> = {
  'decoding': 'Decoding audio...',
  'analyzing-bpm': 'Detecting BPM...',
  'analyzing-structure': 'Analyzing song structure...',
  'complete': 'Analysis complete!',
  'error': 'Something went wrong',
};

export function UploadProgress({ status, progress, trackName }: UploadProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-bg-card rounded-xl p-6 border border-border">
        {trackName && (
          <p className="text-sm text-text-secondary mb-3 truncate">{trackName}</p>
        )}
        <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-dim to-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-text-secondary mt-3">
          {statusMessages[status] ?? 'Processing...'}
        </p>
      </div>
    </div>
  );
}
