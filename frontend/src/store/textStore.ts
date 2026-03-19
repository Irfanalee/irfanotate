import { create } from 'zustand';
import type { TextDoc } from '../api/text';

interface TextStore {
  docs: TextDoc[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;

  setDocs: (docs: TextDoc[]) => void;
  setCurrentIndex: (i: number) => void;
  nextDoc: () => void;
  prevDoc: () => void;
  removeDoc: (filename: string) => void;
  setIsAnnotated: (filename: string, val: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getCurrentDoc: () => TextDoc | null;
}

export const useTextStore = create<TextStore>((set, get) => ({
  docs: [],
  currentIndex: 0,
  isLoading: false,
  error: null,

  setDocs: (docs) => set({ docs, currentIndex: 0, error: null }),

  setCurrentIndex: (i) => {
    const { docs } = get();
    if (i >= 0 && i < docs.length) {
      set({ currentIndex: i });
    }
  },

  nextDoc: () => {
    const { currentIndex, docs } = get();
    if (currentIndex < docs.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prevDoc: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  removeDoc: (filename) => {
    set((state) => {
      const newDocs = state.docs.filter((d) => d.filename !== filename);
      const newIndex = Math.min(state.currentIndex, Math.max(0, newDocs.length - 1));
      return { docs: newDocs, currentIndex: newIndex };
    });
  },

  setIsAnnotated: (filename, val) => {
    set((state) => ({
      docs: state.docs.map((d) => (d.filename === filename ? { ...d, is_annotated: val } : d)),
    }));
  },

  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getCurrentDoc: () => {
    const { docs, currentIndex } = get();
    return docs[currentIndex] || null;
  },
}));
