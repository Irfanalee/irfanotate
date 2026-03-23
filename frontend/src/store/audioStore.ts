import { create } from 'zustand';
import type { AudioFile } from '../api/audio';

interface AudioStore {
  files: AudioFile[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;

  setFiles: (files: AudioFile[]) => void;
  setCurrentIndex: (i: number) => void;
  nextFile: () => void;
  prevFile: () => void;
  removeFile: (filename: string) => void;
  setIsAnnotated: (filename: string, val: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getCurrentFile: () => AudioFile | null;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  files: [],
  currentIndex: 0,
  isLoading: false,
  error: null,

  setFiles: (files) => set({ files, currentIndex: 0, error: null }),

  setCurrentIndex: (i) => {
    const { files } = get();
    if (i >= 0 && i < files.length) set({ currentIndex: i });
  },

  nextFile: () => {
    const { currentIndex, files } = get();
    if (currentIndex < files.length - 1) set({ currentIndex: currentIndex + 1 });
  },

  prevFile: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  removeFile: (filename) => {
    set((state) => {
      const newFiles = state.files.filter((f) => f.filename !== filename);
      const newIndex = Math.min(state.currentIndex, Math.max(0, newFiles.length - 1));
      return { files: newFiles, currentIndex: newIndex };
    });
  },

  setIsAnnotated: (filename, val) => {
    set((state) => ({
      files: state.files.map((f) => (f.filename === filename ? { ...f, is_annotated: val } : f)),
    }));
  },

  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getCurrentFile: () => {
    const { files, currentIndex } = get();
    return files[currentIndex] || null;
  },
}));
