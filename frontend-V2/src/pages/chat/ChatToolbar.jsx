import React from 'react';
import { Button } from '../../components/ui/Button';
import { Download, FileText, History, Scroll, Trash2, Sparkles } from 'lucide-react';

export function ChatToolbar({ onClear, onExportText, onExportJson, onToggleHistory, isHistoryOpen, onScrollBottom, loading }) {
  return (
    <div role="toolbar" aria-label="Chat actions" className="flex flex-wrap items-center gap-2 border-b border-border/40 bg-gradient-to-r from-background/70 to-muted/30 p-2 backdrop-blur-sm">
      <Button size="sm" variant="secondary" onClick={onScrollBottom} className="gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/25 transition-colors">
        <Scroll className="w-4 h-4" /> Scroll to bottom
      </Button>

      <Button size="sm" variant="secondary" onClick={onToggleHistory} aria-pressed={isHistoryOpen} className="gap-1 hover:bg-primary/10 transition-colors">
        <History className="w-4 h-4" /> {isHistoryOpen ? 'Hide History' : 'Show History'}
      </Button>

        <Button size="sm" onClick={onExportText} className="gap-1 bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-shadow">
        <FileText className="w-4 h-4" /> Export TXT
      </Button>

        <Button size="sm" onClick={onExportJson} className="gap-1 bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg transition-shadow">
        <Download className="w-4 h-4" /> Export JSON
      </Button>

      <Button size="sm" variant="destructive" onClick={onClear} disabled={loading} className="gap-1 hover:bg-red-600 transition-colors">
        <Trash2 className="w-4 h-4" /> Clear Chat
      </Button>

      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Advanced Features Active</span>
      </div>
    </div>
  );
}
