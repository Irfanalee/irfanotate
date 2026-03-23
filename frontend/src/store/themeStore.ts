import { create } from 'zustand';

export type Theme = 'white' | 'grey' | 'blue' | 'dark' | 'midnight' | 'system';

const STORAGE_KEY = 'dataforge-theme';

function getSystemPreference(): 'white' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'white';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const savedTheme = ((localStorage.getItem(STORAGE_KEY)) as Theme | null) ?? 'white';

export const useThemeStore = create<ThemeStore>(() => ({
  theme: savedTheme,
  setTheme: (theme: Theme) => {
    useThemeStore.setState({ theme });
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  },
}));

// Apply on load
applyTheme(savedTheme);

// Keep system theme in sync with OS preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useThemeStore.getState().theme === 'system') {
    applyTheme('system');
  }
});
