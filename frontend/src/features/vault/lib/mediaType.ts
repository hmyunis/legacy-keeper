export type VaultMediaType = 'image' | 'video' | 'audio' | 'pdf' | 'unknown';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.tif', '.tiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.oga'];
const PDF_EXTENSIONS = ['.pdf'];

const MIME_KEYS = ['mime_type', 'mimetype', 'content_type', 'file_type', 'media_type'];

const readMimeFromExif = (exif?: Record<string, unknown>): string | null => {
  if (!exif) return null;
  for (const key of MIME_KEYS) {
    const value = exif[key];
    if (typeof value === 'string' && value.trim()) return value.toLowerCase();
  }
  return null;
};

const stripQuery = (url: string) => {
  const [base] = url.split(/[?#]/);
  return base.toLowerCase();
};

export function detectVaultMediaType(url?: string, exif?: Record<string, unknown>): VaultMediaType {
  const mime = readMimeFromExif(exif);
  if (mime?.includes('pdf')) return 'pdf';
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.startsWith('audio/')) return 'audio';
  if (mime?.startsWith('image/')) return 'image';

  if (!url) return 'unknown';
  const normalized = stripQuery(url);
  if (PDF_EXTENSIONS.some((ext) => normalized.endsWith(ext))) return 'pdf';
  if (VIDEO_EXTENSIONS.some((ext) => normalized.endsWith(ext))) return 'video';
  if (AUDIO_EXTENSIONS.some((ext) => normalized.endsWith(ext))) return 'audio';
  if (IMAGE_EXTENSIONS.some((ext) => normalized.endsWith(ext))) return 'image';
  return 'unknown';
}
