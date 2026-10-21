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
  'https://inv.nadeko.net'
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
 * Fetches playlist information & tracklist concurrently with fast-race across active Invidious instances
 */
export const fetchPlaylistInfo = async (playlistId: string): Promise<YouTubePlaylistInfo> => {
  const tasks = INVIDIOUS_INSTANCES.map(async (instance) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch(`${instance}/api/v1/playlists/${playlistId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const rawText = await res.text();
      if (!rawText || rawText.startsWith('<!DOCTYPE') || rawText.includes('CAPTCHA')) {
        throw new Error('Received HTML/CAPTCHA instead of JSON');
      }

      const data = JSON.parse(rawText);
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
      throw new Error('No videos found in response');
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  });

  try {
    return await Promise.any(tasks);
  } catch (err: any) {
    throw new Error('Playlist konnte online nicht geladen werden. Bitte prüfe deine Internetverbindung.');
  }
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
 * Safely downloads an image URL into FileSystem.documentDirectory so it is persistent and offline-available.
 */
export const downloadCoverImageLocally = async (
  url?: string,
  prefix: string = 'cover'
): Promise<string | undefined> => {
  if (!url || typeof url !== 'string') return undefined;

  // If already a local file path, verify existence
  if (url.startsWith('file://') || url.startsWith('/')) {
    try {
      const info = await FileSystem.getInfoAsync(url);
      if (info.exists) return url;
    } catch (e) {}
    return undefined;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return undefined;
  }

  try {
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanPrefix}_${Date.now()}.jpg`;
    const localPath = `${(FileSystem as any).documentDirectory}${filename}`;

    const downloadRes = await FileSystem.downloadAsync(url, localPath, {
      sessionType: FileSystem.FileSystemSessionType.BACKGROUND
    });

    if (downloadRes.status === 200) {
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists && (info.size === undefined || info.size > 500)) {
        return localPath;
      }
    }
  } catch (err) {
    console.warn(`[CoverDownload] Error downloading cover from ${url}:`, err);
  }
  return undefined;
};

/**
 * Downloads a track's cover locally, trying provided thumbnail and YouTube CDN HD fallbacks.
 * If the track has no cover, it automatically takes the playlist / album cover.
 */
export const downloadTrackCoverWithFallback = async (
  trackId: string,
  providedThumbUrl?: string,
  fallbackCoverUri?: string
): Promise<string | undefined> => {
  const candidates: string[] = [];

  if (providedThumbUrl && (providedThumbUrl.startsWith('http://') || providedThumbUrl.startsWith('https://'))) {
    candidates.push(providedThumbUrl);
  }

  // Standard YouTube CDN thumbnails for valid 11-character video IDs
  if (trackId && trackId.length === 11) {
    candidates.push(`https://i.ytimg.com/vi/${trackId}/maxresdefault.jpg`);
    candidates.push(`https://i.ytimg.com/vi/${trackId}/hqdefault.jpg`);
    candidates.push(`https://i.ytimg.com/vi/${trackId}/mqdefault.jpg`);
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  for (const candUrl of uniqueCandidates) {
    const local = await downloadCoverImageLocally(candUrl, `cover_yt_${trackId}`);
    if (local) return local;
  }

  // If track has no cover or all download attempts failed, adopt playlist / album cover!
  if (fallbackCoverUri) {
    if (fallbackCoverUri.startsWith('file://') || fallbackCoverUri.startsWith('/')) {
      return fallbackCoverUri;
    }
    if (fallbackCoverUri.startsWith('http://') || fallbackCoverUri.startsWith('https://')) {
      const localPl = await downloadCoverImageLocally(fallbackCoverUri, `pl_cover_fallback_${Date.now()}`);
      if (localPl) return localPl;
    }
  }

  return undefined;
};

/**
 * Converts a YouTube video to MP3 via loader.to / savenow backend and downloads it to FileSystem.documentDirectory
 */
export const convertAndDownloadTrack = async (
  track: YouTubeTrack,
  onStatusUpdate?: (status: string) => void,
  fallbackCoverUri?: string
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

  // Step 4: Download Thumbnail as local cover image (or fall back to playlist/album cover)
  let localCoverPath: string | undefined = undefined;
  if (!cancelRequested) {
    try {
      localCoverPath = await downloadTrackCoverWithFallback(
        track.id,
        finalThumbUrl || track.thumbnailUrl,
        fallbackCoverUri
      );
    } catch (e) {
      console.warn("Failed to download thumbnail, continuing without cover:", e);
      if (fallbackCoverUri && (fallbackCoverUri.startsWith('file://') || fallbackCoverUri.startsWith('/'))) {
        localCoverPath = fallbackCoverUri;
      }
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

  // If playlist cover is a remote URL, download it locally right away so it is offline-available
  if (playlistCoverUri && (playlistCoverUri.startsWith('http://') || playlistCoverUri.startsWith('https://'))) {
    const localPlCover = await downloadCoverImageLocally(
      playlistCoverUri,
      `pl_${playlistTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    );
    if (localPlCover) {
      playlistCoverUri = localPlCover;
    }
  }

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
      const songResult = await convertAndDownloadTrack(
        track,
        (status) => {
          const liveProgress = {
            ...progress,
            currentSongTitle: `${track.title} (${status})`
          };
          if (onProgress) onProgress(liveProgress);
          useMusicStore.getState().setDownloadProgress(liveProgress);
        },
        playlistCoverUri
      );

      // Either save song's own cover or automatically adopt playlist cover
      const effectiveCover = songResult.coverUri || playlistCoverUri;
      const songWithCover = {
        ...songResult,
        coverUri: effectiveCover
      };

      downloadedSongs.push(songWithCover);

      // If playlist had no cover yet, adopt this song's cover as the playlist cover!
      if (!playlistCoverUri && effectiveCover) {
        playlistCoverUri = effectiveCover;
        // Backfill any prior songs in this batch that lacked a cover
        for (let j = 0; j < downloadedSongs.length; j++) {
          if (!downloadedSongs[j].coverUri) {
            downloadedSongs[j].coverUri = playlistCoverUri;
          }
        }
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

  // Ensure every track in the playlist has a cover (falls back to playlistCoverUri)
  const finalSongs = downloadedSongs.map(s => ({
    ...s,
    coverUri: s.coverUri || playlistCoverUri,
    cachedUri: s.uri,
    isStream: false
  }));

  // Register playlist in Zustand useMusicStore
  useMusicStore.getState().addPlaylist(
    playlistTitle || 'YouTube Playlist',
    playlistCoverUri,
    finalSongs
  );

  // Also register all songs in downloadedSongs
  finalSongs.forEach((s: any, idx: number) => {
    useMusicStore.getState().addDownloadedSong({
      id: `yt_${s.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx}`,
      title: s.title,
      artist: s.artist,
      uri: s.uri,
      cachedUri: s.uri,
      coverUri: s.coverUri || playlistCoverUri,
      isStream: false,
      durationMillis: 180000,
      playCount: 0,
      playHistory: []
    });
  });

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
        const finalSongs = queue.downloadedSongs.map(s => ({
          ...s,
          coverUri: s.coverUri || queue.playlistCoverUri,
          cachedUri: s.uri,
          isStream: false
        }));
        useMusicStore.getState().addPlaylist(
          queue.playlistTitle || 'YouTube Playlist',
          queue.playlistCoverUri,
          finalSongs
        );
        finalSongs.forEach((s: any, idx: number) => {
          useMusicStore.getState().addDownloadedSong({
            id: `yt_${s.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx}`,
            title: s.title,
            artist: s.artist,
            uri: s.uri,
            cachedUri: s.uri,
            coverUri: s.coverUri || queue.playlistCoverUri,
            isStream: false,
            durationMillis: 180000,
            playCount: 0,
            playHistory: []
          });
        });
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
