import React from 'react';
import { Sidebar } from './Sidebar';
import { HeaderFolderPicker } from './HeaderFolderPicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useGlobalFolder } from '../../contexts/GlobalFolderContext';
import { Moon, Sun, Sprout } from 'lucide-react';
import { useApiHealth } from '../../hooks/useApiHealth';

import { GlobalVoiceControl } from './GlobalVoiceControl';

export function AppLayout({ children }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const {
    folders,
    selectedFolderId,
    setSelectedFolderId,
    loading,
  } = useGlobalFolder();
  const apiHealth = useApiHealth();
  const apiChipClass =
    apiHealth === 'online'
      ? 'bg-primary/12 text-primary border-primary/25'
      : apiHealth === 'degraded'
        ? 'bg-warning/15 text-warning border-warning/30'
        : 'bg-muted/30 text-muted-foreground border-border/50';
  //  throw new Error("Simulated Frontend Crash"); // (error handeling testing)
  return (
    <div className="app-shell-bg flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar />

      <div className="relative flex h-full w-full flex-1 flex-col overflow-hidden">
        <header className="app-surface sticky top-0 z-[120] flex h-16 shrink-0 items-center justify-between px-8">
          <div className="flex items-center gap-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20">
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-[900] tracking-tighter text-foreground leading-none">NESSO</span>
              <span className="text-[8px] font-black text-primary/70 tracking-[0.25em] uppercase mt-0.5">Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className={`hidden md:inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${apiChipClass}`}>
              API {apiHealth}
            </span>
            <HeaderFolderPicker
              folders={folders}
              selectedFolderId={selectedFolderId}
              setSelectedFolderId={setSelectedFolderId}
              loading={loading}
            />

            <div className="mx-2 h-8 w-px bg-border/40" />

            <div className="app-surface-muted flex items-center gap-2 rounded-[16px] p-1">
              <GlobalVoiceControl />
              <button
                onClick={toggleTheme}
                id="theme-toggle-btn"
                type="button"
                aria-label={resolvedTheme === 'dark' ? 'Activate Light Mode' : 'Activate Dark Mode'}
                className="group relative flex h-8 w-8 items-center justify-center rounded-[12px] bg-card text-primary shadow-sm transition hover:scale-105 active:scale-95"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4 transition-transform duration-700 group-hover:rotate-90" />
                ) : (
                  <Moon className="h-4 w-4 transition-transform duration-700 group-hover:-rotate-45" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="relative flex-1 flex flex-col overflow-hidden focus:outline-none scroll-smooth bg-transparent">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.06),_transparent_45%)]" />
          <div className="flex flex-1 flex-col h-full min-h-0 w-full px-6 md:px-10 lg:px-12 max-w-[1920px] mx-auto overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
