import React from 'react';
import { Compass, Search, X } from 'lucide-react';
import { Input } from '../../../components/ui/Input';

export function GlobalGraphSearch({
  value,
  onChange,
  results = [],
  onClear,
  onJumpToNode,
}) {
  return (
    <div className="relative z-30 min-w-[240px] flex-1 xl:max-w-[360px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search nodes globally"
        className="h-10 rounded-full border-border/50 bg-background pl-10 pr-10 text-sm"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {results.length ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[80] w-full rounded-2xl border border-border/60 bg-popover p-2 text-popover-foreground shadow-2xl">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Jump results
          </div>
          <div className="space-y-1">
            {results.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onJumpToNode(node)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{node.name || node.id}</div>
                  <div className="truncate text-xs text-muted-foreground">{node.type || 'Unknown'}</div>
                </div>
                <Compass className="h-4 w-4 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
