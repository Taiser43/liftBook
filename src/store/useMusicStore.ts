import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  
  isPlaying: boolean;
  isShuffle: boolean;
  
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
  setIsPlaying: (playing: boolean) => void;
  toggleShuffle: () => void;
  incrementPlayCount: (playlistId: string, songId: string) => void;
  
  playNext: () => void;
  playPrevious: () => void;
  
  // Queue Actions
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  
  // Settings Actions
  setPowerSong: (config: PowerSongConfig | null) => void;
  setCrossfadeSeconds: (seconds: number) => void;
  setEqSettings: (settings: number[]) => void;
  setDownloadProgress: (progress: any) => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      playlists: [],
      currentPlaylistId: null,
      currentSongId: null,
      
      queue: [],
      currentQueueSong: null,
      playbackQueue: [],
      
      isPlaying: false,
      isShuffle: false,
      
      powerSong: null,
      crossfadeSeconds: 0,
      eqSettings: [0, 0, 0, 0, 0],
      downloadProgress: null,

      addPlaylist: (name, coverUri, rawSongs) => set((state) => {
        const newSongs: Song[] = rawSongs.map(s => ({
          ...s,
          id: uuidv4(),
          playCount: 0,
          playHistory: []
        }));
        
        const newPlaylist: Playlist = {
          id: uuidv4(),
          name,
          coverUri,
          songs: newSongs,
        };
        return { playlists: [...state.playlists, newPlaylist] };
      }),

      deletePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter(p => p.id !== id),
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

      setCurrentSong: (playlistId, songId) => set((state) => {
        const playlist = state.playlists.find(p => p.id === playlistId);
        let queue: string[] = [];
        
        if (playlist) {
          queue = playlist.songs.map(s => s.id);
          if (state.isShuffle) {
            const otherSongs = queue.filter(id => id !== songId);
            for (let i = otherSongs.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
            }
            queue = [songId, ...otherSongs];
          }
        }

        return {
          currentPlaylistId: playlistId,
          currentSongId: songId,
          playbackQueue: queue,
          currentQueueSong: null,
          isPlaying: true
        };
      }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      toggleShuffle: () => set((state) => {
        const newShuffle = !state.isShuffle;
        let newQueue: string[] = [];
        
        if (state.currentPlaylistId && state.currentSongId) {
          const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
          if (playlist) {
             if (newShuffle) {
               const otherSongs = playlist.songs.map(s => s.id).filter(id => id !== state.currentSongId);
               for (let i = otherSongs.length - 1; i > 0; i--) {
                 const j = Math.floor(Math.random() * (i + 1));
                 [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
               }
               newQueue = [state.currentSongId, ...otherSongs];
             } else {
               newQueue = playlist.songs.map(s => s.id);
             }
          }
        }
        
        return { 
          isShuffle: newShuffle,
          playbackQueue: newQueue.length > 0 ? newQueue : state.playbackQueue
        };
      }),

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
        if (state.queue.length > 0) {
          const nextQueueSong = state.queue[0];
          return {
            queue: state.queue.slice(1),
            currentQueueSong: nextQueueSong,
            isPlaying: true
          };
        }

        if (!state.currentPlaylistId || !state.currentSongId) return state;
        const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
        if (!playlist || playlist.songs.length === 0) return state;

        let nextSongId = '';
        if (state.playbackQueue && state.playbackQueue.length > 0) {
           const currentIndex = state.playbackQueue.indexOf(state.currentSongId);
           if (currentIndex !== -1) {
             const nextIndex = (currentIndex + 1) % state.playbackQueue.length;
             nextSongId = state.playbackQueue[nextIndex];
           }
        }
        
        if (!nextSongId) {
           const currentIndex = playlist.songs.findIndex(s => s.id === state.currentSongId);
           const nextIndex = (currentIndex + 1) % playlist.songs.length;
           nextSongId = playlist.songs[nextIndex].id;
        }

        return { 
          currentSongId: nextSongId, 
          currentQueueSong: null,
          isPlaying: true 
        };
      }),

      playPrevious: () => set((state) => {
        if (state.currentQueueSong) {
          return { currentQueueSong: null, isPlaying: true };
        }

        if (!state.currentPlaylistId || !state.currentSongId) return state;
        const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
        if (!playlist || playlist.songs.length === 0) return state;

        let prevSongId = '';
        if (state.playbackQueue && state.playbackQueue.length > 0) {
           const currentIndex = state.playbackQueue.indexOf(state.currentSongId);
           if (currentIndex !== -1) {
             const prevIndex = (currentIndex - 1 + state.playbackQueue.length) % state.playbackQueue.length;
             prevSongId = state.playbackQueue[prevIndex];
           }
        }
        
        if (!prevSongId) {
           const currentIndex = playlist.songs.findIndex(s => s.id === state.currentSongId);
           const prevIndex = (currentIndex - 1 + playlist.songs.length) % playlist.songs.length;
           prevSongId = playlist.songs[prevIndex].id;
        }

        return { currentSongId: prevSongId, isPlaying: true };
      }),

      addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
      removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
      clearQueue: () => set({ queue: [] }),
      
      setPowerSong: (config) => set({ powerSong: config }),
      setCrossfadeSeconds: (seconds) => set({ crossfadeSeconds: seconds }),
      setEqSettings: (settings) => set({ eqSettings: settings }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),
    }),
    {
      name: 'music-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
