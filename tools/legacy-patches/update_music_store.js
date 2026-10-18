const fs = require('fs');

const newStoreContent = `import { create } from 'zustand';
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
  
  isPlaying: boolean;
  isShuffle: boolean;
  
  // New Features
  powerSong: PowerSongConfig | null;
  crossfadeSeconds: number;
  eqSettings: number[];
  
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
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      playlists: [],
      currentPlaylistId: null,
      currentSongId: null,
      
      queue: [],
      currentQueueSong: null,
      
      isPlaying: false,
      isShuffle: false,
      
      powerSong: null,
      crossfadeSeconds: 0,
      eqSettings: [0, 0, 0, 0, 0],

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
        return {
          playlists: state.playlists.map(p => 
            p.id === playlistId ? { ...p, songs: [...p.songs, ...newSongs] } : p
          )
        };
      }),

      removeSongFromPlaylist: (playlistId, songId) => set((state) => ({
        playlists: state.playlists.map(p => 
          p.id === playlistId ? { ...p, songs: p.songs.filter(s => s.id !== songId) } : p
        )
      })),

      setCurrentSong: (playlistId, songId) => set({
        currentPlaylistId: playlistId,
        currentSongId: songId,
        currentQueueSong: null, // Clear queue playback when manually selecting a song
        isPlaying: true
      }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

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
        // 1. Check if we have songs in the manual queue
        if (state.queue.length > 0) {
          const nextQueueSong = state.queue[0];
          return {
            queue: state.queue.slice(1),
            currentQueueSong: nextQueueSong,
            isPlaying: true
          };
        }

        // 2. Queue empty, return to normal playlist
        if (!state.currentPlaylistId || !state.currentSongId) return state;
        const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
        if (!playlist || playlist.songs.length === 0) return state;

        const currentIndex = playlist.songs.findIndex(s => s.id === state.currentSongId);
        let nextIndex = 0;

        if (state.isShuffle) {
          nextIndex = Math.floor(Math.random() * playlist.songs.length);
        } else {
          nextIndex = (currentIndex + 1) % playlist.songs.length;
        }

        return { 
          currentSongId: playlist.songs[nextIndex].id, 
          currentQueueSong: null,
          isPlaying: true 
        };
      }),

      playPrevious: () => set((state) => {
        // If playing from queue, skipping previous doesn't make much sense, but let's just abort queue and go back to playlist
        if (state.currentQueueSong) {
          return { currentQueueSong: null, isPlaying: true };
        }

        if (!state.currentPlaylistId || !state.currentSongId) return state;
        const playlist = state.playlists.find(p => p.id === state.currentPlaylistId);
        if (!playlist || playlist.songs.length === 0) return state;

        const currentIndex = playlist.songs.findIndex(s => s.id === state.currentSongId);
        let prevIndex = 0;

        if (state.isShuffle) {
          prevIndex = Math.floor(Math.random() * playlist.songs.length);
        } else {
          prevIndex = (currentIndex - 1 + playlist.songs.length) % playlist.songs.length;
        }

        return { currentSongId: playlist.songs[prevIndex].id, isPlaying: true };
      }),

      addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
      removeFromQueue: (index) => set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),
      clearQueue: () => set({ queue: [] }),
      
      setPowerSong: (config) => set({ powerSong: config }),
      setCrossfadeSeconds: (seconds) => set({ crossfadeSeconds: seconds }),
      setEqSettings: (settings) => set({ eqSettings: settings }),
    }),
    {
      name: 'music-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
`;
fs.writeFileSync('src/store/useMusicStore.ts', newStoreContent);
console.log("Updated useMusicStore.ts");
