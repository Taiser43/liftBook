import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

export const extractMetadata = async (fileUri: string) => {
  try {
    // Read first 500KB to capture ID3 tags
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 500 * 1024,
    });
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    if (buffer.length < 10) return null;
    
    // Check "ID3"
    if (buffer[0] !== 0x49 || buffer[1] !== 0x44 || buffer[2] !== 0x33) {
      return null;
    }
    
    const version = buffer[3];
    const size = (buffer[6] << 21) | (buffer[7] << 14) | (buffer[8] << 7) | buffer[9];
    
    let offset = 10;
    let title = null;
    let artist = null;
    let coverUri = null;
    
    while (offset < buffer.length && offset < size + 10) {
      if (buffer[offset] === 0) break; // Padding reached
      
      const frameId = buffer.toString('utf8', offset, offset + 4);
      let frameSize = 0;
      
      if (version === 3) {
        frameSize = buffer.readUInt32BE(offset + 4);
      } else if (version === 4) {
        frameSize = (buffer[offset+4] << 21) | (buffer[offset+5] << 14) | (buffer[offset+6] << 7) | buffer[offset+7];
      } else {
        break; 
      }
      
      const frameDataOffset = offset + 10;
      if (frameDataOffset + frameSize > buffer.length) break;
      
      const frameData = buffer.slice(frameDataOffset, frameDataOffset + frameSize);
      
      if (frameId === 'TIT2') {
        const encoding = frameData[0];
        title = encoding === 1 || encoding === 2 
          ? frameData.slice(1).toString('utf16le').replace(/\0/g, '')
          : frameData.slice(1).toString('utf8').replace(/\0/g, '');
      } else if (frameId === 'TPE1') {
        const encoding = frameData[0];
        artist = encoding === 1 || encoding === 2 
          ? frameData.slice(1).toString('utf16le').replace(/\0/g, '')
          : frameData.slice(1).toString('utf8').replace(/\0/g, '');
      } else if (frameId === 'APIC') {
        const encoding = frameData[0];
        let mimeEnd = 1;
        while (mimeEnd < frameData.length && frameData[mimeEnd] !== 0) {
          mimeEnd++;
        }
        
        let descEnd = mimeEnd + 2; // skip mime \0 and picture type
        if (encoding === 1 || encoding === 2) {
          while (descEnd < frameData.length - 1 && !(frameData[descEnd] === 0 && frameData[descEnd+1] === 0)) {
            descEnd += 2;
          }
          descEnd += 2;
        } else {
          while (descEnd < frameData.length && frameData[descEnd] !== 0) {
            descEnd++;
          }
          descEnd++;
        }
        
        const imageData = frameData.slice(descEnd);
        const coverBase64 = imageData.toString('base64');
        const ext = mimeEnd > 1 && frameData.toString('ascii', 1, mimeEnd).includes('png') ? 'png' : 'jpg';
        const coverPath = (FileSystem as any).documentDirectory + 'cover_' + Date.now() + '_' + Math.floor(Math.random()*1000) + '.' + ext;
        
        await FileSystem.writeAsStringAsync(coverPath, coverBase64, { encoding: FileSystem.EncodingType.Base64 });
        coverUri = coverPath;
      }
      
      offset += 10 + frameSize;
    }
    
    return { title, artist, coverUri };
  } catch (e) {
    console.warn("ID3 parsing error:", e);
    return null;
  }
};

export const processImportedAudioAssets = async (assets: any[]) => {
  const rawSongs = await Promise.all(assets.map(async (asset) => {
    let permanentUri = asset.uri;
    try {
      const filename = asset.name || asset.uri.split('/').pop() || `song_${Date.now()}.mp3`;
      const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const newUri = (FileSystem as any).documentDirectory + safeFilename;
      await FileSystem.copyAsync({ from: asset.uri, to: newUri });
      permanentUri = newUri;
    } catch (e) {
      console.warn("Failed to copy audio file", e);
    }

    // Default metadata based on filename
    let parsedTitle = asset.name ? asset.name.replace(/\.[^/.]+$/, "") : "Unknown Title";
    let parsedArtist = 'Unknown Artist';
    if (parsedTitle.includes(' - ')) {
      const parts = parsedTitle.split(' - ');
      parsedArtist = parts[0].trim();
      parsedTitle = parts.slice(1).join(' - ').trim();
    }

    let metaTitle = parsedTitle;
    let metaArtist = parsedArtist;
    let metaCoverUri = undefined;

    try {
      const id3 = await extractMetadata(permanentUri);
      if (id3) {
        if (id3.title && id3.title.trim()) metaTitle = id3.title.trim();
        if (id3.artist && id3.artist.trim()) metaArtist = id3.artist.trim();
        if (id3.coverUri) metaCoverUri = id3.coverUri;
      }
    } catch (e) {
      console.warn("Error parsing ID3 for file", permanentUri, e);
    }

    return {
      title: metaTitle,
      artist: metaArtist,
      uri: permanentUri,
      coverUri: metaCoverUri
    };
  }));
  
  return rawSongs;
};
