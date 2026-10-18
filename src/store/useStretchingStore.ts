import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import stretchingData from '../data/stretching_data.json';

export interface StretchingExercise {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  categories: string[];
}

interface StretchingState {
  exercises: StretchingExercise[];
  searchQuery: string;
  activeFilter: string;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: string) => void;
  filteredExercises: () => StretchingExercise[];
  getAllCategories: () => string[];
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
}

export const useStretchingStore = create<StretchingState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggleFavorite: (id) => {
        const { favoriteIds } = get();
        if (favoriteIds.includes(id)) {
          set({ favoriteIds: favoriteIds.filter(f => f !== id) });
        } else {
          set({ favoriteIds: [...favoriteIds, id] });
        }
      },
  exercises: stretchingData as StretchingExercise[],
  searchQuery: '',
  activeFilter: 'All',
  
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveFilter: (f) => set({ activeFilter: f }),
  
  filteredExercises: () => {
    const { exercises, searchQuery, activeFilter, favoriteIds } = get();
    return exercises.filter(ex => {
      const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            ex.categories.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      let matchesFilter = false;
      if (activeFilter === 'All') matchesFilter = true;
      else if (activeFilter === 'Favorites') matchesFilter = favoriteIds.includes(ex.id);
      else matchesFilter = ex.categories.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });
  },
  
  getAllCategories: () => {
    const { exercises } = get();
    const cats = new Set<string>();
    exercises.forEach(ex => ex.categories.forEach(c => cats.add(c)));
    return ['All', 'Favorites', 'Hip', 'Stretch', 'Mobility', 'Low Back', 'Shoulder', 'Knee', 'Hamstrings', 'Chest', ...Array.from(cats).filter(c => !['Hip', 'Stretch', 'Mobility', 'Low Back', 'Shoulder', 'Knee', 'Hamstrings', 'Chest'].includes(c))];
  }
}),
    {
      name: 'stretching-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ favoriteIds: state.favoriteIds }),
    }
  )
);
