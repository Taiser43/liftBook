import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMusicStore } from '../store/useMusicStore';
import {
  showDownloadProgressNotification,
  hideDownloadProgressNotification,
  showDownloadCompletedNotification
} from './notificationService';

export interface YouTubeTrack {
  id: string;
  title: string;
  author: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  selected?: boolean;
}

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  author: string;
  thumbnailUrl?: string;
  tracks: YouTubeTrack[];
}

export interface DownloadProgress {
  isDownloading: boolean;
  playlistName: string;
  completed: number;
  total: number;
  currentSongTitle: string;
  progressPercent: number;
  error?: string;
}

export interface PersistedDownloadQueue {
  playlistTitle: string;
  tracks: YouTubeTrack[];
  currentIndex: number;
  downloadedSongs: { title: string; artist: string; uri: string; coverUri?: string }[];
  playlistCoverUri?: string;
  isDownloading: boolean;
  startedAt: number;
}

const STORAGE_KEY_ACTIVE_DOWNLOAD = '@active_yt_download_queue';

let isDownloadingActive = false;
let cancelRequested = false;
let activeDownloadResumable: FileSystem.DownloadResumable | null = null;

export const getIsDownloadActive = () => isDownloadingActive;

const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://invidious.projectsegfau.lt',
  'https://invidious.protokolla.fi',
  'https://inv.nadeko.net',
  'https://invidious.tiekoetter.com'
];

/**
 * Extracts playlist or video ID from various YouTube URL formats
 */
export const parseYouTubeUrl = (url: string): { type: 'playlist' | 'video' | null; id: string | null; videoIdFallback?: string | null } => {
  if (!url || typeof url !== 'string') return { type: null, id: null };
  const cleanUrl = url.trim();

  // Video match (check first to capture video ID in case it's in a playlist link)
  const videoMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  const videoId = videoMatch && videoMatch[1] ? videoMatch[1] : null;

  // Playlist check (e.g. list=PL...)
  const playlistMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch && playlistMatch[1]) {
    return { type: 'playlist', id: playlistMatch[1], videoIdFallback: videoId };
  }

  if (videoId) {
    return { type: 'video', id: videoId };
  }

  return { type: null, id: null };
};

/**
 * Fetches playlist information & tracklist from Invidious with fallback instances
 */
export const fetchPlaylistInfo = async (playlistId: string): Promise<YouTubePlaylistInfo> => {
  let lastError: any = null;

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${instance}/api/v1/playlists/${playlistId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.videos && Array.isArray(data.videos)) {
          const tracks: YouTubeTrack[] = data.videos.map((v: any) => ({
            id: v.videoId,
            title: v.title || 'Unknown Title',
            author: v.author || data.author || 'YouTube Artist',
            durationSeconds: v.lengthSeconds || 0,
            thumbnailUrl: v.videoThumbnails && v.videoThumbnails.length > 0 
              ? v.videoThumbnails[v.videoThumbnails.length - 1].url 
              : `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            selected: true
          }));

          return {
            id: playlistId,
            title: data.title || 'YouTube Playlist',
            author: data.author || 'YouTube',
            thumbnailUrl: tracks.length > 0 ? tracks[0].thumbnailUrl : undefined,
            tracks
          };
        }
      }
    } catch (e) {
      lastError = e;
      console.warn(`Invidious instance ${instance} failed for playlist ${playlistId}:`, e);
    }
  }

  throw new Error(lastError ? `Playlist konnte nicht geladen werden: ${lastError.message || lastError}` : 'Keine Antwort von YouTube API erhalten.');
};

/**
 * Fetches info for a single YouTube video
 */
export const fetchSingleVideoInfo = async (videoId: string): Promise<YouTubeTrack> => {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (res.ok) {
      const data = await res.json();
      return {
        id: videoId,
        title: data.title || 'Unknown Video',
        author: data.author_name || 'YouTube Artist',
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        selected: true
      };
    }
  } catch (e) {
    console.warn("noembed failed, fallback to default", e);
  }

  return {
    id: videoId,
    title: `YouTube Track (${videoId})`,
    author: 'YouTube',
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    selected: true
  };
};

/**
 * Converts a YouTube video to MP3 via loader.to / savenow backend and downloads it to FileSystem.documentDirectory
 */
export const convertAndDownloadTrack = async (
  track: YouTubeTrack,
  onStatusUpdate?: (status: string) => void
): Promise<{ uri: string; coverUri?: string; title: string; artist: string }> => {
  if (cancelRequested) {
    throw new Error('Download wurde abgebrochen.');
  }

  if (onStatusUpdate) onStatusUpdate(`Starte Konvertierung: ${track.title}`);

  // Step 1: Request conversion
  const startUrl = `https://loader.to/ajax/download.php?format=mp3&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${track.id}`)}`;
  const startRes = await fetch(startUrl, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
  });

  if (!startRes.ok) {
    throw new Error(`Konvertierungs-Anfrage fehlgeschlagen (HTTP ${startRes.status})`);
  }

  const startData = await startRes.json();
  const jobId = startData.id;
  if (!jobId) {
    throw new Error('Keine Job-ID vom Konvertierer erhalten.');
  }

  // Step 2: Poll progress until finished
  let downloadUrl: string | null = null;
  let finalThumbUrl: string | null = track.thumbnailUrl || null;
  let attempts = 0;
  const maxAttempts = 35; // approx 70 seconds max

  const pollUrl = startData.progress_url || `https://p.savenow.to/ajax/progress.php?id=${jobId}`;

  while (!downloadUrl && attempts < maxAttempts) {
    if (cancelRequested) {
      throw new Error('Download wurde abgebrochen.');
    }
    await new Promise(r => setTimeout(r, 2000));
    attempts++;

    try {
      const progressRes = await fetch(pollUrl, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://loader.to/'
        }
      });
      if (progressRes.ok) {
        const progData = await progressRes.json();
        if (progData.success === 1 && progData.download_url) {
          downloadUrl = progData.download_url;
          if (progData.thumbnail_url) finalThumbUrl = progData.thumbnail_url;
          break;
        } else if (progData.success === 0 && onStatusUpdate) {
          onStatusUpdate(`Konvertiere MP3 (${progData.progress ? Math.floor(progData.progress / 10) : 50}%)...`);
        }
      }
    } catch (e) {
      console.warn("Poll attempt failed, retrying...", e);
    }
  }

  if (!downloadUrl) {
    throw new Error('Zeitüberschreitung bei der MP3-Erstellung.');
  }

  if (cancelRequested) {
    throw new Error('Download wurde abgebrochen.');
  }

  // Step 3: Download MP3 with native background session
  if (onStatusUpdate) onStatusUpdate(`Lade Audiodatei herunter...`);
  const mp3Filename = `yt_${track.id}_${Date.now()}.mp3`;
  const localMp3Path = (FileSystem as any).documentDirectory + mp3Filename;

  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    localMp3Path,
    { sessionType: FileSystem.FileSystemSessionType.BACKGROUND }
  );
  activeDownloadResumable = downloadResumable;

  let downloadResult: FileSystem.FileSystemDownloadResult | undefined;
  try {
    downloadResult = await downloadResumable.downloadAsync();
  } finally {
    activeDownloadResumable = null;
  }

  if (!downloadResult || downloadResult.status !== 200) {
    throw new Error(`Download der Audiodatei fehlgeschlagen (${downloadResult ? 'HTTP ' + downloadResult.status : 'abgebrochen'})`);
  }

  // Step 4: Download Thumbnail as local cover image
  let localCoverPath: string | undefined = undefined;
  if (finalThumbUrl && !cancelRequested) {
    try {
      const coverFilename = `cover_yt_${track.id}_${Date.now()}.jpg`;
      const coverPath = (FileSystem as any).documentDirectory + coverFilename;
      const coverResult = await FileSystem.downloadAsync(finalThumbUrl, coverPath, {
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND
      });
      if (coverResult.status === 200) {
        localCoverPath = coverPath;
      }
    } catch (e) {
      console.warn("Failed to download thumbnail, continuing without cover:", e);
    }
  }

  // Parse title & artist cleanly
  let cleanTitle = track.title;
  let cleanArtist = track.author || 'YouTube Artist';
  if (cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ');
    cleanArtist = parts[0].trim();
    cleanTitle = parts.slice(1).join(' - ').trim();
  }
  cleanTitle = cleanTitle.replace(/\s*[\(\[](?:Official|Music Video|Audio|Lyric Video|4K|HD|Remastered)[\)\]]/gi, '').trim();

  return {
    uri: localMp3Path,
    coverUri: localCoverPath,
    title: cleanTitle || track.title,
    artist: cleanArtist
  };
};

/**
 * Downloads a list of tracks sequentially in the background/standby and saves them as a new Playlist in useMusicStore.
 * Persists progress in AsyncStorage so downloads can seamlessly survive lock screen, standby, and app switches.
 */
export const downloadFullPlaylistInBackground = async (
  playlistTitle: string,
  tracks: YouTubeTrack[],
  onProgress?: (progress: DownloadProgress) => void,
  onComplete?: (playlistName: string, songCount: number) => void,
  onError?: (errMessage: string) => void,
  startIndex: number = 0,
  initialDownloadedSongs: { title: string; artist: string; uri: string; coverUri?: string }[] = [],
  initialCoverUri?: string
) => {
  const selectedTracks = tracks.filter(t => t.selected !== false);
  if (selectedTracks.length === 0) {
    if (onError) onError('Keine Tracks zum Herunterladen ausgewählt.');
    return;
  }

  if (isDownloadingActive && startIndex === 0) {
    console.warn('[YouTubeDownloader] Download already active.');
    return;
  }

  isDownloadingActive = true;
  cancelRequested = false;

  const total = selectedTracks.length;
  const downloadedSongs = [...initialDownloadedSongs];
  let playlistCoverUri = initialCoverUri;

  // Persist queue initially
  const persistedQueue: PersistedDownloadQueue = {
    playlistTitle,
    tracks: selectedTracks,
    currentIndex: startIndex,
    downloadedSongs,
    playlistCoverUri,
    isDownloading: true,
    startedAt: Date.now()
  };
  await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_DOWNLOAD, JSON.stringify(persistedQueue));

  for (let i = startIndex; i < total; i++) {
    if (cancelRequested) {
      break;
    }

    const track = selectedTracks[i];
    const progressPercent = Math.round((i / total) * 100);

    const progress: DownloadProgress = {
      isDownloading: true,
      playlistName: playlistTitle,
      completed: i,
      total,
      currentSongTitle: track.title,
      progressPercent
    };

    // Update in-app state
    if (onProgress) onProgress(progress);
    useMusicStore.getState().setDownloadProgress(progress);

    // Update Lock Screen & System Notification for standby visibility
    await showDownloadProgressNotification(
      playlistTitle,
      i,
      total,
      track.title,
      progressPercent
    );

    try {
      const songResult = await convertAndDownloadTrack(track, (status) => {
        const liveProgress = {
          ...progress,
          currentSongTitle: `${track.title} (${status})`
        };
        if (onProgress) onProgress(liveProgress);
        useMusicStore.getState().setDownloadProgress(liveProgress);
      });

      downloadedSongs.push(songResult);
      if (!playlistCoverUri && songResult.coverUri) {
        playlistCoverUri = songResult.coverUri;
      }

      // Update persisted queue in AsyncStorage after each successfully downloaded track
      persistedQueue.currentIndex = i + 1;
      persistedQueue.downloadedSongs = downloadedSongs;
      persistedQueue.playlistCoverUri = playlistCoverUri;
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_DOWNLOAD, JSON.stringify(persistedQueue));
    } catch (err: any) {
      if (cancelRequested) {
        console.log('[YouTubeDownloader] Download was cancelled.');
        break;
      }
      console.warn(`Fehler beim Herunterladen von "${track.title}":`, err);
      // We continue with remaining tracks so 1 failure doesn't cancel the entire playlist
    }
  }

  if (cancelRequested) {
    isDownloadingActive = false;
    cancelRequested = false;
    await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DOWNLOAD);
    await hideDownloadProgressNotification();
    useMusicStore.getState().setDownloadProgress(null);
    return;
  }

  if (downloadedSongs.length === 0) {
    isDownloadingActive = false;
    await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DOWNLOAD);
    await hideDownloadProgressNotification();
    useMusicStore.getState().setDownloadProgress(null);
    if (onError) onError('Keines der Lieder konnte heruntergeladen werden.');
    return;
  }

  // Register playlist in Zustand useMusicStore
  useMusicStore.getState().addPlaylist(
    playlistTitle || 'YouTube Playlist',
    playlistCoverUri,
    downloadedSongs
  );

  // Clear persistent active queue
  await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DOWNLOAD);

  // Show lock screen completion notification
  await showDownloadCompletedNotification(playlistTitle, downloadedSongs.length);

  isDownloadingActive = false;

  const finalProgress: DownloadProgress = {
    isDownloading: false,
    playlistName: playlistTitle,
    completed: downloadedSongs.length,
    total,
    currentSongTitle: 'Fertig!',
    progressPercent: 100
  };

  if (onProgress) onProgress(finalProgress);
  useMusicStore.getState().setDownloadProgress(null);

  if (onComplete) {
    onComplete(playlistTitle, downloadedSongs.length);
  }
};

/**
 * Resumes any unfinished playlist downloads across app restarts or standby wakeups
 */
export const resumePendingDownloadsIfNeeded = async () => {
  if (isDownloadingActive) return;

  try {
    const rawQueue = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_DOWNLOAD);
    if (!rawQueue) return;

    const queue: PersistedDownloadQueue = JSON.parse(rawQueue);
    if (!queue || !queue.tracks || !queue.tracks.length) {
      await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DOWNLOAD);
      return;
    }

    if (queue.currentIndex >= queue.tracks.length) {
      // Completed, register if not yet done
      if (queue.downloadedSongs && queue.downloadedSongs.length > 0) {
        useMusicStore.getState().addPlaylist(
          queue.playlistTitle || 'YouTube Playlist',
          queue.playlistCoverUri,
          queue.downloadedSongs
        );
        await showDownloadCompletedNotification(queue.playlistTitle, queue.downloadedSongs.length);
      }
      await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DOWNLOAD);
      await hideDownloadProgressNotification();
      return;
    }

    console.log(`[YouTubeDownloader] Resuming download for "${queue.playlistTitle}" at song ${queue.currentIndex + 1}/${queue.tracks.length}`);

    downloadFullPlaylistInBackground(
      queue.playlistTitle,
      queue.tracks,
      (progress) => {
        useMusicStore.getState().setDownloadProgress(progress);
      },
      (playlistName, count) => {
        useMusicStore.getState().setDownloadProgress(null);
      },
      (err) => {
        useMusicStore.getState().setDownloadProgress(null);
      },
      queue.currentIndex,
      queue.downloadedSongs || [],
      queue.playlistCoverUri
    );
  } catch (err) {
    console.warn('[YouTubeDownloader] Error in resumePendingDownloadsIfNeeded:', err);
  }
};

/**
 * Cancels active download, dismisses notifications and cleans up queue
 */
export const cancelActiveDownload = async () => {
  cancelRequested = true;
  if (activeDownloadResumable) {
    try {
      await activeDownloadResumable.cancelAsync();
    } catch (e) {
      console.warn('[YouTubeDownloader] Error cancelling resumable download:', e);
    }
    activeDownloadResumable = null;
  }
  isDownloadingActive = false;
  await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_DOWNLOAD);
  await hideDownloadProgressNotification();
  useMusicStore.getState().setDownloadProgress(null);
};
