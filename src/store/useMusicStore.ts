import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Song {
  id: string;
  title: string;
  uri: string;
  durationMillis?: number;
  artist?: string;
  album?: string;
  coverUri?: string;
  playCount: number;
  playHistory?: number[]; // Timestamps of plays
  isStream?: boolean;
  streamUrl?: string;
  videoId?: string;
  isLiked?: boolean;
  bpm?: number;
  cachedUri?: string;
}

export interface Playlist {
  id: string;
  name: string;
  coverUri?: string;
  songs: Song[];
}

export interface PowerSongConfig {
  songId: string;
  playlistId: string;
  startPosition: number;
}

export interface MusicState {
  playlists: Playlist[];
  currentPlaylistId: string | null;
  currentSongId: string | null;
  
  // Queue System
  queue: Song[];
  currentQueueSong: Song | null;
  playbackQueue: string[]; // Stores the ordered or shuffled sequence of song IDs for the active playlist
  activeStreamPlaylist: Playlist | null;
  
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  favoriteSongs: Song[];
  downloadedSongs: Song[];
  
  // New Features
  powerSong: PowerSongConfig | null;
  crossfadeSeconds: number;
  eqSettings: number[];
  
  // YouTube Download Progress State
  downloadProgress: {
    isDownloading: boolean;
    playlistName: string;
    completed: number;
    total: number;
    currentSongTitle: string;
    progressPercent: number;
    error?: string;
  } | null;
  
  // Actions
  addPlaylist: (name: string, coverUri: string | undefined, songs: Omit<Song, 'id' | 'playCount'>[]) => void;
  deletePlaylist: (id: string) => void;
  updatePlaylist: (id: string, name: string, coverUri?: string) => void;
  
  addSongsToPlaylist: (playlistId: string, songs: Omit<Song, 'id' | 'playCount'>[]) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  
  setCurrentSong: (playlistId: string, songId: string) => void;
  playPlaylist: (playlistId: string, options?: { startSongId?: string; shuffle?: boolean }) => void;
  setStreamPlaylist: (playlist: Playlist | null) => void;
  getCurrentPlaylist: () => Playlist | null;
  getCurrentSong: () => Song | null;
  getNextSong: () => Song | null;
  getNextSongs: (count?: number) => Song[];
  getActiveSongs: () => Song[];
  updateSongStreamUrl: (songId: string, streamUrl: string) => void;
  setIsPlaying: (playing: boolean) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLikeSong: (songId: string) => void;
  toggleFavoriteSong: (song: Song | Omit<Song, 'playCount'>) => boolean;
  isSongFavorite: (songId: string) => boolean;
  playStreamSongDirectly: (song: Omit<Song, 'playCount'>) => void;
  cacheSongLocally: (songId: string, cachedUri: string) => void;
  addDownloadedSong: (song: Song) => void;
  removeDownloadedSong: (songId: string) => Promise<void>;
  getAllDownloadedSongs: () => Song[];
  incrementPlayCount: (playlistId: string, songId: string) => void;
  
  playNext: () => void;
  playPrevious: () => void;
  
  // Queue Actions
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  
  // Pinned Quick-Access Playlists
  pinnedPlaylistIds?: string[];
  pinPlaylist: (id: string) => void;
  unpinPlaylist: (id: string) => void;
  togglePinPlaylist: (id: string) => void;
  isPlaylistPinned: (id: string) => boolean;

  // Settings Actions
  setPowerSong: (config: PowerSongConfig | null) => void;
  setCrossfadeSeconds: (seconds: number) => void;
  setEqSettings: (settings: number[]) => void;
  setDownloadProgress: (progress: any) => void;
  retroactiveFillMissingCovers: () => Promise<{ updatedSongs: number; updatedPlaylists: number }>;
}

// Module-level caches for stable referential equality
let _cachedFavPl: Playlist | null = null;
let _cachedFavSongsRef: Song[] | null = null;
let _cachedDlPl: Playlist | null = null;
let _cachedDlSongsRef: Song[] | null = null;

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      playlists: [],
      currentPlaylistId: null,
      currentSongId: null,
      
      queue: [],
      currentQueueSong: null,
      playbackQueue: [],
      activeStreamPlaylist: null,
      setStreamPlaylist: (playlist) => set({ activeStreamPlaylist: playlist }),
      
      isPlaying: false,
      isShuffle: false,
      isRepeat: false,
      favoriteSongs: [],
      downloadedSongs: [],
      
      powerSong: null,
      crossfadeSeconds: 0,
      eqSettings: [0, 0, 0, 0, 0],
      downloadProgress: null,
      pinnedPlaylistIds: undefined,

      pinPlaylist: (id: string) => set((state) => {
        const current = state.pinnedPlaylistIds !== undefined
          ? state.pinnedPlaylistIds
          : state.playlists.map(p => p.id);
        if (current.includes(id)) return state;
        return { pinnedPlaylistIds: [...current, id] };
      }),

      unpinPlaylist: (id: string) => set((state) => {
        const current = state.pinnedPlaylistIds !== undefined
          ? state.pinnedPlaylistIds
          : state.playlists.map(p => p.id);
        return { pinnedPlaylistIds: current.filter(pid => pid !== id) };
      }),

      togglePinPlaylist: (id: string) => set((state) => {
        const current = state.pinnedPlaylistIds !== undefined
          ? state.pinnedPlaylistIds
          : state.playlists.map(p => p.id);
        const isPinned = current.includes(id);
        return {
          pinnedPlaylistIds: isPinned ? current.filter(pid => pid !== id) : [...current, id]
        };
      }),

      isPlaylistPinned: (id: string) => {
        const state = get();
        if (state.pinnedPlaylistIds === undefined) return true;
        return state.pinnedPlaylistIds.includes(id);
      },

      addPlaylist: (name, coverUri, rawSongs) => set((state) => {
        const newSongs: Song[] = rawSongs.map(s => {
          const isLocallyCached = Boolean(
            (s as any).cachedUri ||
            (s.uri && (s.uri.startsWith('file://') || s.uri.startsWith('/')))
          );
          return {
            ...s,
            id: (s as any).id || uuidv4(),
            coverUri: (s as any).coverUri || coverUri,
            cachedUri: (s as any).cachedUri || s.cachedUri,
            isStream: (s as any).isStream !== undefined ? (s as any).isStream : !isLocallyCached,
            playCount: (s as any).playCount || 0,
            playHistory: (s as any).playHistory || []
          };
        });
        
        const newPlaylist: Playlist = {
          id: uuidv4(),
          name,
          coverUri,
          songs: newSongs,
        };

        const currentPinned = state.pinnedPlaylistIds !== undefined
          ? state.pinnedPlaylistIds
          : state.playlists.map(p => p.id);

        return { 
          playlists: [...state.playlists, newPlaylist],
          pinnedPlaylistIds: [...currentPinned, newPlaylist.id]
        };
      }),

      deletePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter(p => p.id !== id),
        pinnedPlaylistIds: state.pinnedPlaylistIds !== undefined
          ? state.pinnedPlaylistIds.filter(pid => pid !== id)
          : undefined,
        currentPlaylistId: state.currentPlaylistId === id ? null : state.currentPlaylistId,
        currentSongId: state.currentPlaylistId === id ? null : state.currentSongId,
        isPlaying: state.currentPlaylistId === id ? false : state.isPlaying,
      })),

      updatePlaylist: (id, name, coverUri) => set((state) => ({
        playlists: state.playlists.map(p => p.id === id ? { ...p, name, coverUri } : p)
      })),

      addSongsToPlaylist: (playlistId, rawSongs) => set((state) => {
        const newSongs: Song[] = rawSongs.map(s => ({ ...s, id: uuidv4(), playCount: 0, playHistory: [] }));
        
        const newQueue = state.currentPlaylistId === playlistId 
          ? [...(state.playbackQueue || []), ...newSongs.map(s => s.id)]
          : state.playbackQueue;

        return {
          playlists: state.playlists.map(p => 
            p.id === playlistId ? { ...p, songs: [...p.songs, ...newSongs] } : p
          ),
          playbackQueue: newQueue
        };
      }),

      removeSongFromPlaylist: (playlistId, songId) => set((state) => {
        const newQueue = state.currentPlaylistId === playlistId
          ? (state.playbackQueue || []).filter(id => id !== songId)
          : state.playbackQueue;

        return {
          playlists: state.playlists.map(p => 
            p.id === playlistId ? { ...p, songs: p.songs.filter(s => s.id !== songId) } : p
          ),
          playbackQueue: newQueue
        };
      }),

      getActiveSongs: () => {
        const state = get();
        if (state.currentPlaylistId === 'favorites') {
          return state.favoriteSongs || [];
        }
        if (state.currentPlaylistId === 'downloaded') {
          return state.getAllDownloadedSongs();
        }
        if (state.activeStreamPlaylist && (state.currentPlaylistId === state.activeStreamPlaylist.id || !state.currentPlaylistId)) {
          return state.activeStreamPlaylist.songs || [];
        }
        if (state.currentPlaylistId) {
          const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
          if (pl) return pl.songs;
        }
        if (state.activeStreamPlaylist) {
          return state.activeStreamPlaylist.songs || [];
        }
        return [];
      },

      getNextSongs: (count: number = 5) => {
        const state = get();
        const result: Song[] = [];

        // 1. First, take any explicitly queued songs from state.queue
        const userQueue = state.queue || [];
        for (let i = 0; i < userQueue.length && result.length < count; i++) {
          result.push(userQueue[i]);
        }

        if (result.length >= count) return result;

        // 2. Identify active playlist songs
        const activeSongs = state.getActiveSongs();
        if (activeSongs.length === 0) return result;

        const currId = state.currentSongId || (state.currentQueueSong ? state.currentQueueSong.id : '');
        const orderIds = (state.playbackQueue && state.playbackQueue.length > 0)
          ? state.playbackQueue
          : activeSongs.map(s => s.id);

        let currentIndex = orderIds.indexOf(currId);
        if (currentIndex === -1) {
          currentIndex = activeSongs.findIndex(s => s.id === currId);
        }

        // Loop forward to find up to `count` songs
        for (let step = 1; step <= orderIds.length && result.length < count; step++) {
          const nextIndex = (currentIndex + step) % orderIds.length;
          const nextId = orderIds[nextIndex];
          if (nextId === currId && orderIds.length > 1) {
            break;
          }
          const songObj = activeSongs.find(s => s.id === nextId);
          if (songObj && !result.some(r => r.id === songObj.id)) {
            result.push(songObj);
          }
        }

        return result;
      },

      getNextSong: () => {
        const state = get();
        const list = state.getNextSongs(1);
        return list.length > 0 ? list[0] : null;
      },

      updateSongStreamUrl: (songId: string, streamUrl: string) => set((state) => {
        let newStreamPl = state.activeStreamPlaylist;
        if (newStreamPl) {
          newStreamPl = {
            ...newStreamPl,
            songs: newStreamPl.songs.map(s => s.id === songId ? { ...s, streamUrl, uri: streamUrl } : s)
          };
        }
        const newPlaylists = state.playlists.map(p => ({
          ...p,
          songs: p.songs.map(s => s.id === songId ? { ...s, streamUrl, uri: streamUrl } : s)
        }));
        const newFavs = (state.favoriteSongs || []).map(s => s.id === songId ? { ...s, streamUrl, uri: streamUrl } : s);
        const newDownloads = (state.downloadedSongs || []).map(s => s.id === songId ? { ...s, streamUrl, uri: streamUrl } : s);

        return {
          activeStreamPlaylist: newStreamPl,
          playlists: newPlaylists,
          favoriteSongs: newFavs,
          downloadedSongs: newDownloads
        };
      }),

      getCurrentPlaylist: () => {
        const state = get();
        if (state.activeStreamPlaylist && state.currentPlaylistId === state.activeStreamPlaylist.id) {
          return state.activeStreamPlaylist;
        }
        if (state.currentPlaylistId === 'favorites') {
          if (_cachedFavPl && _cachedFavSongsRef === state.favoriteSongs) {
            return _cachedFavPl;
          }
          _cachedFavSongsRef = state.favoriteSongs || [];
          _cachedFavPl = {
            id: 'favorites',
            name: 'Favoriten',
            songs: _cachedFavSongsRef
          };
          return _cachedFavPl;
        }
        if (state.currentPlaylistId === 'downloaded') {
          if (_cachedDlPl && _cachedDlSongsRef === state.downloadedSongs) {
            return _cachedDlPl;
          }
          _cachedDlSongsRef = state.downloadedSongs || [];
          _cachedDlPl = {
            id: 'downloaded',
            name: 'Offline',
            songs: state.getAllDownloadedSongs()
          };
          return _cachedDlPl;
        }
        if (state.currentPlaylistId) {
          const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
          if (pl) return pl;
        }
        if (state.activeStreamPlaylist) {
          return state.activeStreamPlaylist;
        }
        return null;
      },

      getCurrentSong: () => {
        const state = get();
        if (state.currentQueueSong) {
          return state.currentQueueSong;
        }
        if (!state.currentSongId) return null;

        const currentPl = state.getCurrentPlaylist();
        if (currentPl) {
          const found = currentPl.songs.find(s => s.id === state.currentSongId);
          if (found) return found;
        }

        // Search in activeStreamPlaylist
        if (state.activeStreamPlaylist) {
          const found = state.activeStreamPlaylist.songs.find(s => s.id === state.currentSongId);
          if (found) return found;
        }

        // Search in all playlists
        for (const pl of state.playlists) {
          const found = pl.songs.find(s => s.id === state.currentSongId);
          if (found) return found;
        }

        // Search in temporary queue
        if (state.queue && state.queue.length > 0) {
          const found = state.queue.find(s => s.id === state.currentSongId);
          if (found) return found;
        }

        // Search in favorites and downloaded
        const fav = (state.favoriteSongs || []).find(s => s.id === state.currentSongId);
        if (fav) return fav;
        const dl = state.getAllDownloadedSongs().find(s => s.id === state.currentSongId);
        if (dl) return dl;

        return null;
      },

      setCurrentSong: (playlistId, songId) => set((state) => {
        let activeSongs: Song[] = [];
        if (playlistId === 'favorites') {
          activeSongs = state.favoriteSongs || [];
        } else if (playlistId === 'downloaded') {
          activeSongs = state.getAllDownloadedSongs();
        } else if (state.activeStreamPlaylist && playlistId === state.activeStreamPlaylist.id) {
          activeSongs = state.activeStreamPlaylist.songs || [];
        } else {
          const pl = state.playlists.find(p => p.id === playlistId);
          if (pl) activeSongs = pl.songs;
        }

        let queue = activeSongs.map(s => s.id);
        if (state.isShuffle) {
          const otherSongs = queue.filter(id => id !== songId);
          for (let i = otherSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
          }
          queue = [songId, ...otherSongs];
        }

        return {
          currentPlaylistId: playlistId,
          currentSongId: songId,
          playbackQueue: queue,
          currentQueueSong: null,
          queue: [], // Clear any previous temporary queue from older playlists
          isPlaying: true
        };
      }),

      playPlaylist: (playlistId, options) => set((state) => {
        let activeSongs: Song[] = [];
        if (playlistId === 'favorites') {
          activeSongs = state.favoriteSongs || [];
        } else if (playlistId === 'downloaded') {
          activeSongs = state.getAllDownloadedSongs();
        } else if (state.activeStreamPlaylist && playlistId === state.activeStreamPlaylist.id) {
          activeSongs = state.activeStreamPlaylist.songs || [];
        } else {
          const pl = state.playlists.find(p => p.id === playlistId);
          if (pl) activeSongs = pl.songs;
        }

        if (activeSongs.length === 0) return state;

        const shuffle = options?.shuffle ?? state.isShuffle;
        let startId = options?.startSongId;

        let queue = activeSongs.map(s => s.id);

        if (shuffle) {
          if (!startId) {
            const randomIdx = Math.floor(Math.random() * activeSongs.length);
            startId = activeSongs[randomIdx].id;
          }
          const otherSongs = queue.filter(id => id !== startId);
          for (let i = otherSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
          }
          queue = [startId, ...otherSongs];
        } else {
          if (!startId) {
            startId = activeSongs[0].id;
          }
        }

        const chosenSong = activeSongs.find(s => s.id === startId) || activeSongs[0];

        return {
          currentPlaylistId: playlistId,
          currentSongId: chosenSong.id,
          currentQueueSong: null,
          playbackQueue: queue,
          queue: [], // Clear any previous temporary queue from older playlists
          isShuffle: shuffle,
          isPlaying: true
        };
      }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      toggleShuffle: () => set((state) => {
        const newShuffle = !state.isShuffle;
        let activeSongs: Song[] = [];
        if (state.currentPlaylistId === 'favorites') {
          activeSongs = state.favoriteSongs || [];
        } else if (state.currentPlaylistId === 'downloaded') {
          activeSongs = state.getAllDownloadedSongs();
        } else if (state.activeStreamPlaylist && state.currentPlaylistId === state.activeStreamPlaylist.id) {
          activeSongs = state.activeStreamPlaylist.songs || [];
        } else if (state.currentPlaylistId) {
          const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
          if (pl) activeSongs = pl.songs;
        }

        let newQueue: string[] = [];
        const currId = state.currentSongId || (state.currentQueueSong ? state.currentQueueSong.id : '');

        if (activeSongs.length > 0) {
          if (newShuffle) {
            const otherSongs = activeSongs.map(s => s.id).filter(id => id !== currId);
            for (let i = otherSongs.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
            }
            newQueue = currId ? [currId, ...otherSongs] : otherSongs;
          } else {
            newQueue = activeSongs.map(s => s.id);
          }
        }

        return {
          isShuffle: newShuffle,
          playbackQueue: newQueue.length > 0 ? newQueue : state.playbackQueue
        };
      }),

      toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),

      isSongFavorite: (songId: string) => {
        return (get().favoriteSongs || []).some(s => s.id === songId);
      },

      toggleFavoriteSong: (rawSong: Song | Omit<Song, 'playCount'>) => {
        const state = get();
        const currentFavs = state.favoriteSongs || [];
        const exists = currentFavs.some(s => s.id === rawSong.id);
        const willBeLiked = !exists;

        let newFavs: Song[];
        if (exists) {
          newFavs = currentFavs.filter(s => s.id !== rawSong.id);
        } else {
          const newFavSong: Song = {
            ...rawSong,
            playCount: (rawSong as any).playCount || 0,
            playHistory: (rawSong as any).playHistory || [],
            isLiked: true
          };
          newFavs = [newFavSong, ...currentFavs];
        }

        let newQueueSong = state.currentQueueSong;
        if (newQueueSong && newQueueSong.id === rawSong.id) {
          newQueueSong = { ...newQueueSong, isLiked: willBeLiked };
        }

        const newPlaylists = state.playlists.map(p => ({
          ...p,
          songs: p.songs.map(s => s.id === rawSong.id ? { ...s, isLiked: willBeLiked } : s)
        }));

        set({
          favoriteSongs: newFavs,
          currentQueueSong: newQueueSong,
          playlists: newPlaylists
        });

        return willBeLiked;
      },

      toggleLikeSong: (songId: string) => {
        const state = get();
        // Check if we can find the song object in currentQueueSong or playlists or favoriteSongs
        let targetSong: Song | undefined = (state.favoriteSongs || []).find(s => s.id === songId);
        if (!targetSong && state.currentQueueSong && state.currentQueueSong.id === songId) {
          targetSong = state.currentQueueSong;
        }
        if (!targetSong) {
          for (const p of state.playlists) {
            const found = p.songs.find(s => s.id === songId);
            if (found) { targetSong = found; break; }
          }
        }

        if (targetSong) {
          state.toggleFavoriteSong(targetSong);
        } else {
          // Fallback toggle in playlists
          let newQueueSong = state.currentQueueSong;
          if (newQueueSong && newQueueSong.id === songId) {
            newQueueSong = { ...newQueueSong, isLiked: !newQueueSong.isLiked };
          }
          const newPlaylists = state.playlists.map(p => ({
            ...p,
            songs: p.songs.map(s => s.id === songId ? { ...s, isLiked: !s.isLiked } : s)
          }));
          set({ currentQueueSong: newQueueSong, playlists: newPlaylists });
        }
      },

      playStreamSongDirectly: (rawSong) => set((state) => {
        const isOffline = Boolean(
          rawSong.cachedUri ||
          (rawSong.uri && (rawSong.uri.startsWith('file://') || rawSong.uri.startsWith('/')))
        );
        const song: Song = {
          ...rawSong,
          id: rawSong.id || uuidv4(),
          playCount: 1,
          playHistory: [Date.now()],
          isStream: !isOffline
        };
        const currentPl = state.getCurrentPlaylist();
        if (currentPl && currentPl.songs.some(s => s.id === song.id)) {
          return {
            currentSongId: song.id,
            currentQueueSong: null,
            isPlaying: true
          };
        }
        return {
          currentQueueSong: song,
          isPlaying: true
        };
      }),

      cacheSongLocally: (songId: string, cachedUri: string) => set((state) => {
        let newQueueSong = state.currentQueueSong;
        if (newQueueSong && newQueueSong.id === songId) {
          newQueueSong = { ...newQueueSong, cachedUri, uri: cachedUri };
        }
        const newPlaylists = state.playlists.map(p => ({
          ...p,
          songs: p.songs.map(s => s.id === songId ? { ...s, cachedUri, uri: cachedUri } : s)
        }));
        const newFavs = (state.favoriteSongs || []).map(s => s.id === songId ? { ...s, cachedUri, uri: cachedUri } : s);

        // Synchronize in downloadedSongs list as well
        let matchedSong: Song | undefined = (state.downloadedSongs || []).find(s => s.id === songId);
        if (!matchedSong && newQueueSong && newQueueSong.id === songId) matchedSong = newQueueSong;
        if (!matchedSong) {
          for (const p of state.playlists) {
            const found = p.songs.find(s => s.id === songId);
            if (found) { matchedSong = found; break; }
          }
        }
        if (!matchedSong) {
          matchedSong = (state.favoriteSongs || []).find(s => s.id === songId);
        }

        let newDownloaded = state.downloadedSongs || [];
        if (matchedSong) {
          let effectiveCover = matchedSong.coverUri;
          if (!effectiveCover) {
            const parentPl = state.playlists.find(p => p.coverUri && p.songs.some(s => s.id === songId));
            if (parentPl) effectiveCover = parentPl.coverUri;
          }
          const updatedMatched: Song = {
            ...matchedSong,
            cachedUri,
            uri: cachedUri,
            coverUri: effectiveCover || matchedSong.coverUri
          };
          const exIdx = newDownloaded.findIndex(s => s.id === songId);
          if (exIdx >= 0) {
            newDownloaded = [...newDownloaded];
            newDownloaded[exIdx] = updatedMatched;
          } else {
            newDownloaded = [updatedMatched, ...newDownloaded];
          }
        }

        return {
          currentQueueSong: newQueueSong,
          playlists: newPlaylists,
          favoriteSongs: newFavs,
          downloadedSongs: newDownloaded
        };
      }),

      addDownloadedSong: (song: Song) => set((state) => {
        const list = state.downloadedSongs || [];
        let effectiveCover = song.coverUri;
        if (!effectiveCover && state.playlists) {
          const parentPl = state.playlists.find(p => p.coverUri && p.songs.some(s => s.id === song.id || s.title === song.title));
          if (parentPl) {
            effectiveCover = parentPl.coverUri;
          }
        }
        const updatedSong = effectiveCover !== song.coverUri ? { ...song, coverUri: effectiveCover } : song;

        const index = list.findIndex(s => s.id === song.id);
        if (index >= 0) {
          const updated = [...list];
          updated[index] = { ...updated[index], ...updatedSong };
          return { downloadedSongs: updated };
        }
        return { downloadedSongs: [updatedSong, ...list] };
      }),

      removeDownloadedSong: async (songId: string) => {
        const state = get();
        const song = (state.downloadedSongs || []).find(s => s.id === songId);
        const uriToDelete = song?.cachedUri || song?.uri;
        if (uriToDelete && (uriToDelete.startsWith('file://') || uriToDelete.startsWith('/'))) {
          try {
            await FileSystem.deleteAsync(uriToDelete, { idempotent: true });
          } catch (e) {
            console.warn('Error deleting local audio file:', e);
          }
        }
        set((s) => ({
          downloadedSongs: (s.downloadedSongs || []).filter(item => item.id !== songId),
          playlists: s.playlists.map(p => ({
            ...p,
            songs: p.songs.map(item => item.id === songId ? { ...item, cachedUri: undefined } : item)
          })),
          favoriteSongs: (s.favoriteSongs || []).map(item => item.id === songId ? { ...item, cachedUri: undefined } : item)
        }));
      },

      getAllDownloadedSongs: () => {
        const state = get();
        const seenKeys = new Set<string>();
        const result: Song[] = [];

        const addIfDownloaded = (song: Song) => {
          if (!song) return;
          const isDownloaded = Boolean(
            song.cachedUri ||
            (song.uri && (song.uri.startsWith('file://') || song.uri.startsWith('/')))
          );
          if (isDownloaded) {
            const fileKey = song.cachedUri || song.uri;
            const metaKey = `${song.title || ''}_${song.artist || ''}`.trim().toLowerCase();
            if (seenKeys.has(song.id) || (fileKey && seenKeys.has(fileKey)) || (metaKey && seenKeys.has(metaKey))) {
              return;
            }
            seenKeys.add(song.id);
            if (fileKey) seenKeys.add(fileKey);
            if (metaKey) seenKeys.add(metaKey);
            result.push(song);
          }
        };

        (state.downloadedSongs || []).forEach(addIfDownloaded);
        (state.playlists || []).forEach(p => (p.songs || []).forEach(addIfDownloaded));
        (state.favoriteSongs || []).forEach(addIfDownloaded);

        return result;
      },

      incrementPlayCount: (playlistId, songId) => set((state) => {
        const now = Date.now();
        const newPlaylists = state.playlists.map(p => {
          if (p.id === playlistId) {
            return {
              ...p,
              songs: p.songs.map(s => s.id === songId ? { 
                ...s, 
                playCount: s.playCount + 1,
                playHistory: [...(s.playHistory || []), now]
              } : s)
            };
          }
          return p;
        });
        return { playlists: newPlaylists };
      }),

      playNext: () => set((state) => {
        // 1. If user explicitly added a song to queue with "+ Queue"
        if (state.queue && state.queue.length > 0) {
          const nextQueueSong = state.queue[0];
          return {
            queue: state.queue.slice(1),
            currentQueueSong: nextQueueSong,
            isPlaying: true
          };
        }

        // 2. Identify active songs based on current context
        let activeSongs: Song[] = [];
        if (state.currentPlaylistId === 'favorites') {
          activeSongs = state.favoriteSongs || [];
        } else if (state.currentPlaylistId === 'downloaded') {
          activeSongs = state.getAllDownloadedSongs();
        } else if (state.activeStreamPlaylist && state.currentPlaylistId === state.activeStreamPlaylist.id) {
          activeSongs = state.activeStreamPlaylist.songs || [];
        } else if (state.currentPlaylistId) {
          const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
          if (pl) activeSongs = pl.songs;
        }

        if (activeSongs.length === 0 && state.currentQueueSong) {
          const pl = state.playlists.find(p => p.songs.some(s => s.id === state.currentQueueSong?.id));
          if (pl) activeSongs = pl.songs;
        }

        if (activeSongs.length === 0) {
          return { currentQueueSong: null };
        }

        // 3. Find next song according to playbackQueue or activeSongs order
        let nextSongId = '';
        const currId = state.currentSongId || (state.currentQueueSong ? state.currentQueueSong.id : '');

        if (state.playbackQueue && state.playbackQueue.length > 0) {
          const currentIndex = state.playbackQueue.indexOf(currId);
          if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % state.playbackQueue.length;
            nextSongId = state.playbackQueue[nextIndex];
          }
        }

        if (!nextSongId) {
          const currentIndex = activeSongs.findIndex(s => s.id === currId);
          const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % activeSongs.length : 0;
          nextSongId = activeSongs[nextIndex]?.id || activeSongs[0]?.id;
        }

        return {
          currentSongId: nextSongId,
          currentQueueSong: null,
          isPlaying: true
        };
      }),

      playPrevious: () => set((state) => {
        let activeSongs: Song[] = [];
        if (state.currentPlaylistId === 'favorites') {
          activeSongs = state.favoriteSongs || [];
        } else if (state.currentPlaylistId === 'downloaded') {
          activeSongs = state.getAllDownloadedSongs();
        } else if (state.activeStreamPlaylist && state.currentPlaylistId === state.activeStreamPlaylist.id) {
          activeSongs = state.activeStreamPlaylist.songs || [];
        } else if (state.currentPlaylistId) {
          const pl = state.playlists.find(p => p.id === state.currentPlaylistId);
          if (pl) activeSongs = pl.songs;
        }

        if (activeSongs.length === 0 && state.currentQueueSong) {
          const pl = state.playlists.find(p => p.songs.some(s => s.id === state.currentQueueSong?.id));
          if (pl) activeSongs = pl.songs;
        }

        if (activeSongs.length === 0) return state;

        let prevSongId = '';
        const currId = state.currentSongId || (state.currentQueueSong ? state.currentQueueSong.id : '');

        if (state.playbackQueue && state.playbackQueue.length > 0) {
          const currentIndex = state.playbackQueue.indexOf(currId);
          if (currentIndex !== -1) {
            const prevIndex = (currentIndex - 1 + state.playbackQueue.length) % state.playbackQueue.length;
            prevSongId = state.playbackQueue[prevIndex];
          }
        }

        if (!prevSongId) {
          const currentIndex = activeSongs.findIndex(s => s.id === currId);
          const prevIndex = currentIndex !== -1 ? (currentIndex - 1 + activeSongs.length) % activeSongs.length : 0;
          prevSongId = activeSongs[prevIndex]?.id || activeSongs[0]?.id;
        }

        return {
          currentSongId: prevSongId,
          currentQueueSong: null,
          isPlaying: true
        };
      }),

      addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
      removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
      clearQueue: () => set({ queue: [] }),
      
      setPowerSong: (config) => set({ powerSong: config }),
      setCrossfadeSeconds: (seconds) => set({ crossfadeSeconds: seconds }),
      setEqSettings: (settings) => set({ eqSettings: settings }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),

      retroactiveFillMissingCovers: async () => {
        const state = get();
        let updatedSongsCount = 0;
        let updatedPlaylistsCount = 0;

        // Helper to extract a YouTube 11-char videoId
        const findYtId = (song: Partial<Song>): string | null => {
          if (song.videoId && song.videoId.length === 11) return song.videoId;
          if (song.id) {
            if (song.id.length === 11 && !song.id.includes('_') && !song.id.includes('-') && !song.id.includes('.')) {
              return song.id;
            }
            const matchYt = song.id.match(/(?:^|_)yt_([a-zA-Z0-9_-]{11})(?:_|$)/);
            if (matchYt && matchYt[1]) return matchYt[1];
            const matchStream = song.id.match(/^stream_([a-zA-Z0-9_-]{11})$/);
            if (matchStream && matchStream[1]) return matchStream[1];
          }
          if (song.uri) {
            const matchUri = song.uri.match(/(?:youtu\.be\/|v\/|watch\?v=|embed\/|yt_)([a-zA-Z0-9_-]{11})/);
            if (matchUri && matchUri[1]) return matchUri[1];
          }
          if (song.streamUrl) {
            const matchStreamUrl = song.streamUrl.match(/(?:youtu\.be\/|v\/|watch\?v=|embed\/|yt_)([a-zA-Z0-9_-]{11})/);
            if (matchStreamUrl && matchStreamUrl[1]) return matchStreamUrl[1];
          }
          return null;
        };

        const DEFAULT_COVER = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600';

        // 1. Process all playlists
        const updatedPlaylists = (state.playlists || []).map((playlist) => {
          let plCover = playlist.coverUri;

          // If playlist has no cover, check if any song inside has a cover
          if (!plCover) {
            const songWithCover = playlist.songs.find(s => s.coverUri);
            if (songWithCover) {
              plCover = songWithCover.coverUri;
            } else {
              // Try finding any song with a YouTube ID
              for (const s of playlist.songs) {
                const ytid = findYtId(s);
                if (ytid) {
                  plCover = `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg`;
                  break;
                }
              }
            }
          }

          if (!plCover) {
            plCover = DEFAULT_COVER;
          }

          let plModified = false;
          if (plCover !== playlist.coverUri) {
            plModified = true;
            updatedPlaylistsCount++;
          }

          const updatedSongs = (playlist.songs || []).map((song) => {
            if (!song.coverUri) {
              const ytid = findYtId(song);
              const songCover = ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : plCover;
              updatedSongsCount++;
              plModified = true;
              return { ...song, coverUri: songCover };
            }
            return song;
          });

          return plModified ? { ...playlist, coverUri: plCover, songs: updatedSongs } : playlist;
        });

        // 2. Process all downloadedSongs
        const updatedDownloaded = (state.downloadedSongs || []).map((song) => {
          if (!song.coverUri) {
            // Find parent playlist
            const parentPl = updatedPlaylists.find(p => p.songs.some(s => s.id === song.id || s.title === song.title));
            const ytid = findYtId(song);
            const resolvedCover = parentPl?.coverUri || (ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : DEFAULT_COVER);
            updatedSongsCount++;
            return { ...song, coverUri: resolvedCover };
          }
          return song;
        });

        // 3. Process all favoriteSongs
        const updatedFavorites = (state.favoriteSongs || []).map((song) => {
          if (!song.coverUri) {
            const parentPl = updatedPlaylists.find(p => p.songs.some(s => s.id === song.id || s.title === song.title));
            const ytid = findYtId(song);
            const resolvedCover = parentPl?.coverUri || (ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : DEFAULT_COVER);
            updatedSongsCount++;
            return { ...song, coverUri: resolvedCover };
          }
          return song;
        });

        // Immediately update state so UI renders the covers instantly!
        set({
          playlists: updatedPlaylists,
          downloadedSongs: updatedDownloaded,
          favoriteSongs: updatedFavorites
        });

        // 4. Asynchronously download any remote cover images locally so they work offline in the gym!
        (async () => {
          try {
            const { downloadCoverImageLocally } = await import('../services/youtubeDownloadService');
            let hasNewLocalDownloads = false;

            const finalPlaylists = await Promise.all(
              useMusicStore.getState().playlists.map(async (pl) => {
                let localPlCover = pl.coverUri;
                if (localPlCover && localPlCover.startsWith('http')) {
                  const downloaded = await downloadCoverImageLocally(localPlCover, `pl_retro_${pl.id}`);
                  if (downloaded) {
                    localPlCover = downloaded;
                    hasNewLocalDownloads = true;
                  }
                }

                const songsWithLocalCovers = await Promise.all(
                  pl.songs.map(async (s) => {
                    let localSongCover = s.coverUri;
                    if (localSongCover && localSongCover.startsWith('http')) {
                      const downloaded = await downloadCoverImageLocally(localSongCover, `song_retro_${s.id}`);
                      if (downloaded) {
                        localSongCover = downloaded;
                        hasNewLocalDownloads = true;
                      } else if (localPlCover && (localPlCover.startsWith('file://') || localPlCover.startsWith('/'))) {
                        localSongCover = localPlCover;
                        hasNewLocalDownloads = true;
                      }
                    }
                    return localSongCover !== s.coverUri ? { ...s, coverUri: localSongCover } : s;
                  })
                );

                return (localPlCover !== pl.coverUri || songsWithLocalCovers !== pl.songs)
                  ? { ...pl, coverUri: localPlCover, songs: songsWithLocalCovers }
                  : pl;
              })
            );

            const finalDownloaded = await Promise.all(
              useMusicStore.getState().downloadedSongs.map(async (s) => {
                let localSongCover = s.coverUri;
                if (localSongCover && localSongCover.startsWith('http')) {
                  const downloaded = await downloadCoverImageLocally(localSongCover, `song_retro_${s.id}`);
                  if (downloaded) {
                    localSongCover = downloaded;
                    hasNewLocalDownloads = true;
                  }
                }
                return localSongCover !== s.coverUri ? { ...s, coverUri: localSongCover } : s;
              })
            );

            const finalFavorites = await Promise.all(
              useMusicStore.getState().favoriteSongs.map(async (s) => {
                let localSongCover = s.coverUri;
                if (localSongCover && localSongCover.startsWith('http')) {
                  const downloaded = await downloadCoverImageLocally(localSongCover, `song_retro_${s.id}`);
                  if (downloaded) {
                    localSongCover = downloaded;
                    hasNewLocalDownloads = true;
                  }
                }
                return localSongCover !== s.coverUri ? { ...s, coverUri: localSongCover } : s;
              })
            );

            if (hasNewLocalDownloads) {
              set({
                playlists: finalPlaylists,
                downloadedSongs: finalDownloaded,
                favoriteSongs: finalFavorites
              });
            }
          } catch (e) {
            console.warn('[RetroactiveCover] Background download failed:', e);
          }
        })();

        return { updatedSongs: updatedSongsCount, updatedPlaylists: updatedPlaylistsCount };
      },
    }),
    {
      name: 'music-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
