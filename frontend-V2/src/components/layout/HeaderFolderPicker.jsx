import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FolderOpen, Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';

export function HeaderFolderPicker({
  folders,
  selectedFolderId,
  setSelectedFolderId,
  loading,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const selectedFolder = useMemo(
    () => folders.find((folder) => String(folder.id) === String(selectedFolderId)) || null,
    [folders, selectedFolderId]
  );

  const filteredFolders = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return folders;

    return folders.filter((folder) => {
      const name = String(folder.name || '').toLowerCase();
      const id = String(folder.id || '').toLowerCase();
      return name.includes(term) || id.includes(term);
    });
  }, [folders, query]);

  return (
    <div ref={containerRef} className={cn('relative mr-2', open && 'z-[130]')}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Select active folder"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="header-folder-options"
        disabled={loading || folders.length === 0}
        className="flex h-10 items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-3 text-left transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FolderOpen className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Folder</span>
        <span className="max-w-[180px] truncate text-sm font-medium text-foreground">
          {selectedFolder?.name || (loading ? 'Loading...' : 'No folders')}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[140] w-[320px] rounded-2xl border border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search folders"
              className="h-10 pl-10"
              autoFocus
            />
          </div>

          <div id="header-folder-options" role="listbox" aria-label="Folders" className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
            {filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => {
                const active = String(folder.id) === String(selectedFolderId);

                return (
                  <button
                    key={folder.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedFolderId(String(folder.id));
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{folder.name || folder.id}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {Number(folder.file_count || 0).toLocaleString()} files
                      </p>
                    </div>
                    {active && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 px-3 py-6 text-center text-sm text-muted-foreground">
                No folders match this search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
