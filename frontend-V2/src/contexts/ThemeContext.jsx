import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(undefined);
const THEME_STORAGE_KEY = 'nnv2-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      return storedTheme;
    }
    return 'light';
  });

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (theme !== 'system') return undefined;

    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    const handleChange = () => {
      const nextTheme = mediaQuery.matches ? 'dark' : 'light';
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(nextTheme);
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.add('theme-switching');
    setTheme((prev) => {
      const currentTheme = prev === 'system' ? getSystemTheme() : prev;
      return currentTheme === 'dark' ? 'light' : 'dark';
    });
    window.setTimeout(() => {
      root.classList.remove('theme-switching');
    }, 160);
  };

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }), [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
