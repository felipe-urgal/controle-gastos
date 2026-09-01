'use client';

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const themeListeners = new Set<() => void>();

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const savedTheme = window.localStorage.getItem('theme');
  return isTheme(savedTheme) ? savedTheme : 'system';
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === 'theme') listener();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    themeListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function storeTheme(theme: Theme): void {
  window.localStorage.setItem('theme', theme);
  for (const listener of themeListeners) listener();
}

function prefersDark(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

function subscribeColorScheme(listener: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'system');
  const systemDark = useSyncExternalStore(
    subscribeColorScheme,
    prefersDark,
    () => false,
  );
  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme: storeTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
