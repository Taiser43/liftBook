import * as FileSystem from 'expo-file-system/legacy';

export function getResolvedUri(uri: string | undefined): string | undefined {
  if (!uri) return uri;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;

  const docDir: string = (FileSystem as any).documentDirectory || '';
  const filename = uri.split('/').pop();
  if (!filename) return uri;

  // If the path was stored in the music_cache subdirectory
  if (uri.includes('music_cache')) {
    return `${docDir}music_cache/${filename}`;
  }

  // Rewrite absolute Documents or files path to the active document directory
  if (uri.includes('/Documents/') || uri.includes('/files/')) {
    return docDir + filename;
  }

  // Bare filename or relative path
  if (!uri.startsWith('file://') && !uri.startsWith('/')) {
    // Only prepend documentDirectory if the URI looks like an audio/image file path with an extension
    const isMediaFile = /\.(mp3|m4a|wav|aac|ogg|flac|webm|opus|jpg|jpeg|png|webp)$/i.test(uri);
    if (isMediaFile) {
      return docDir + uri;
    }
    // Otherwise it's a stream ID, YouTube video ID, Audius track ID, or query parameter -> Return as is!
    return uri;
  }

  return uri;
}
