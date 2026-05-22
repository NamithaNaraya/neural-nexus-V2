import React from 'react';
import { Button } from '../../components/ui/Button';
import { Trash2, Clock, X, History, Activity, BrainCircuit } from 'lucide-react';
import { SkeletonText } from '../../components/ui/Skeleton';
import { cn } from '../../utils/cn';

export const ChatHistoryPanel = React.memo(function ChatHistoryPanel({ chatHistory, onRestore, onDelete, onClose, activeSessionId, isLoading }) {
  const safeHistory = Array.isArray(chatHistory) ? chatHistory : [];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-border/20 bg-secondary/10 backdrop-blur-3xl shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-border/10 px-6 py-5 bg-secondary/5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
            <History className="h-4 w-4" />
            Repository Stash
          </div>
          <p className="mt-1 text-[11px] font-bold text-muted-foreground/50 leading-relaxed uppercase tracking-wider">
            Curated Research History
          </p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
            onClick={onClose}
            aria-label="Secure Stash"
          >
            <X className="h-4.5 w-4.5" />
          </Button>
        ) : null}
      </div>

      <ul className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
        {isLoading && safeHistory.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/10 p-5 space-y-2 animate-pulse bg-secondary/5">
               <div className="h-3 w-1/2 bg-primary/10 rounded-full" />
               <div className="h-2 w-3/4 bg-muted/10 rounded-full" />
            </div>
            <div className="rounded-2xl border border-border/10 p-5 space-y-2 animate-pulse bg-secondary/5">
               <div className="h-3 w-2/3 bg-primary/10 rounded-full" />
               <div className="h-2 w-1/2 bg-muted/10 rounded-full" />
            </div>
          </div>
        ) : null}

        {!isLoading && safeHistory.length === 0 ? (
          <li className="rounded-[24px] border border-dashed border-border/30 bg-primary/5 p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Activity className="h-8 w-8 text-primary/30" />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                No research sessions found
              </p>
            </div>
          </li>
        ) : null}

        {safeHistory.map((session) => {
          const isActive = session.id === activeSessionId;
          const sessionMessages = Array.isArray(session?.messages) ? session.messages : [];
          const preview =
            sessionMessages.find((message) => message?.role === 'user' && message?.content)?.content
            || sessionMessages.find((message) => message?.role === 'assistant' && !message?.isWelcome)?.content
            || '';
          const previewSingleLine = String(preview || '').split('\n')[0].trim();
          const createdAtLabel = session?.updatedAt 
            ? new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : 'Unknown date';

          return (
            <li
              key={session?.id || Math.random().toString(36).slice(2, 11)}
              className={cn(
                "group relative rounded-[28px] border transition-all duration-500 overflow-hidden",
                isActive
                  ? "border-primary/40 bg-primary/10 shadow-xl shadow-primary/10 ring-1 ring-primary/20"
                  : "border-border/15 bg-white/40 hover:border-primary/30 hover:bg-white/60 hover:shadow-lg dark:bg-card/40 dark:hover:bg-card/60"
              )}
            >
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => session?.id && onRestore(session.id)}
                  className="min-w-0 flex-1 px-5 py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn(
                      "min-w-0 flex-1 truncate text-[13px] font-black tracking-tight",
                      isActive ? "text-primary" : "text-foreground/80"
                    )}>
                      {session?.title || 'Initializing node...'}
                    </div>
                    {isActive && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary animate-pulse">
                        <Activity className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {session?.folderName && (
                    <div className="mt-2 inline-flex items-center rounded-lg border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
                      {session.folderName}
                    </div>
                  )}

                  {previewSingleLine && (
                    <div className="mt-2 line-clamp-2 text-[11px] leading-relaxed font-bold text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
                      {previewSingleLine}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-border/10 pt-3">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                      <Clock className="h-3 w-3" />
                      {createdAtLabel}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                      {session?.messageCount || sessionMessages.length} Messages
                    </div>
                  </div>
                </button>

                <div className="flex w-12 flex-col justify-center border-l border-border/10 bg-secondary/5 px-2 transition-all group-hover:bg-destructive/5">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => session?.id && onDelete(session.id)}
                    className="h-8 w-8 rounded-xl hover:bg-destructive hover:text-white transition-all duration-300"
                    title="Delete Session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
