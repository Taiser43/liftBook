import * as FileSystem from 'expo-file-system/legacy';

export function getResolvedUri(uri: string | undefined): string | undefined {
  if (!uri) return uri;
  
  // Expo's document directory can change on iOS app updates/restarts
  // So we must rewrite stored absolute URIs to the current document directory
  if (uri.includes('/Documents/') || uri.includes('/files/')) {
    const filename = uri.split('/').pop();
    if (filename) {
       return (FileSystem as any).documentDirectory + filename;
    }
  }
  return uri;
}
