import React from 'react';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { FileText, Network, GitFork, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function FolderFilesPanel({
  active,
  folderContentSearch,
  setFolderContentSearch,
  filesLoading,
  filteredFolderFiles,
}) {
  return (
    <section
      aria-hidden={!active}
      className={cn(
        'relative flex-1 flex flex-col min-h-0 transition-opacity duration-200 ease-out',
        active
          ? 'z-10 opacity-100 flex-1'
          : 'z-0 pointer-events-none opacity-0 h-0 overflow-hidden'
      )}
    >
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[13px] font-black uppercase tracking-wider text-foreground/80">Source Files</h3>
          <p className="text-[11px] text-muted-foreground font-medium">Search knowledge sources in this folder.</p>
        </div>
        <Input
          value={folderContentSearch}
          onChange={(e) => setFolderContentSearch(e.target.value)}
          placeholder="Search files..."
          className="h-10 w-full lg:max-w-xs rounded-xl border-border/40 focus:ring-primary/20"
        />
        </div>

        <div className="relative flex-1 min-h-0 space-y-2 overflow-y-auto pr-3 pb-24 transition-colors [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-primary/5 [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/50">
          <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 shadow-inner opacity-50" />
          {filesLoading && filteredFolderFiles.length > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-end pb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm backdrop-blur-md">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </span>
            </div>
          )}

          {filesLoading && filteredFolderFiles.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
            </div>
          ) : filteredFolderFiles.length > 0 ? (
            filteredFolderFiles.map((file) => (
              <div
              key={file.id}
              className="group relative flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 dark:bg-black/40 px-4 py-3 transition-all hover:bg-white/20 dark:hover:bg-white/10 hover:border-primary/30 dark:border-white/5 dark:hover:border-white/20 hover:shadow-[0_8px_32px_-8px_rgba(45,58,40,0.1)] hover:-translate-y-0.5 backdrop-blur-md shadow-inner"
            >
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-500 shadow-inner">
                  <FileText className="w-5.5 h-5.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black tracking-tight text-foreground/80 group-hover:text-primary transition-colors">{file.filename}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <Badge variant={file.status === 'completed' ? 'success' : file.status === 'processing' ? 'info' : 'secondary'} className="text-[8px] font-black uppercase tracking-[0.1em] rounded-md h-[18px] px-2 border-none">
                      {file.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest flex items-center gap-2 group-hover:text-muted-foreground/60 transition-colors">
                      <Network className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary/60 transition-colors" /> {file.node_count || 0}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="hidden sm:flex shrink-0 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-xl border-white/10 bg-white/5 text-muted-foreground/60">
                  {file.file_type}
                </Badge>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-border/20 bg-muted/5 p-6 text-center text-sm text-muted-foreground italic">
              {folderContentSearch.trim() ? 'No matching files found.' : 'No files in this folder.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
