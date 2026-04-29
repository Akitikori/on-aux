const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp3'];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav)$/i)) {
    return { valid: false, error: 'Please upload an MP3 or WAV file.' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: 'File is too large. Maximum size is 50MB.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File appears to be empty.' };
  }
  return { valid: true };
}
