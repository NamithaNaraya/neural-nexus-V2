import React from 'react';
import { Check, FolderOpen, Network, Search, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Input, Label } from '../../../components/ui/Input';
import { cn } from '../../../utils/cn';

export function AnalyticsScopePanel({
  folderId,
  currentFolder,
  graphStats,
  loadingNodes,
  scopeMode,
  setScopeMode,
  selectedNodes,
  clearSelection,
  nodeSearch,
  setNodeSearch,
  filteredNodes,
  toggleNode,
}) {
  return (
    <Card className="border-border/60 bg-card/70 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
      <CardContent className="space-y-5 p-5">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Step 1</div>
          <h2 className="text-lg font-semibold">Choose data</h2>
          <p className="text-sm text-muted-foreground">The folder in the global header is the dataset for this page. Then run on all folder data or only a selected subset.</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FolderOpen className="h-4 w-4 text-primary" />
            {currentFolder?.name || (folderId ? 'Selected folder' : 'No folder selected')}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/30 bg-background/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Nodes</p>
              <p className="mt-1 text-sm font-semibold">{graphStats.nodes.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Relations</p>
              <p className="mt-1 text-sm font-semibold">{graphStats.links.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Run scope</Label>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setScopeMode('folder')}
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                scopeMode === 'folder'
                  ? 'border-primary/30 bg-primary/10 shadow-sm'
                  : 'border-border/40 bg-background/35 hover:border-primary/20'
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen className="h-4 w-4 text-primary" />
                Run all folder data
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Use every node and relationship from the selected folder.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('selection')}
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                scopeMode === 'selection'
                  ? 'border-primary/30 bg-primary/10 shadow-sm'
                  : 'border-border/40 bg-background/35 hover:border-primary/20'
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Network className="h-4 w-4 text-primary" />
                Run selected nodes only
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Choose only the particular nodes you want to analyze.
              </p>
            </button>
          </div>
        </div>

        <div className={cn('space-y-2', scopeMode !== 'selection' && 'opacity-60')}>
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Step 2: select particular nodes if needed</Label>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedNodes.length === 0}>
              Clear
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nodeSearch}
              onChange={(event) => setNodeSearch(event.target.value)}
              placeholder={loadingNodes ? 'Loading folder nodes...' : 'Search nodes inside this folder'}
              className="pl-10"
              disabled={scopeMode !== 'selection'}
            />
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filteredNodes.map((node) => {
              const active = selectedNodes.includes(node.id);

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => toggleNode(node.id)}
                  disabled={scopeMode !== 'selection'}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    active
                      ? 'border-primary/30 bg-primary/10 shadow-sm'
                      : 'border-border/40 bg-background/35 hover:border-primary/20 hover:bg-background/55',
                    scopeMode !== 'selection' && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{node.name || node.id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{node.type || 'Entity'}</p>
                    </div>
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                      active ? 'border-primary bg-primary text-white' : 'border-border/60 text-muted-foreground'
                    )}>
                      {active ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-0" />}
                    </div>
                  </div>
                </button>
              );
            })}

            {!loadingNodes && filteredNodes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/40 bg-background/30 px-4 py-6 text-center text-sm text-muted-foreground">
                No nodes match this search in the current folder.
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {scopeMode === 'selection'
              ? `${selectedNodes.length} selected node${selectedNodes.length === 1 ? '' : 's'} will be used when you run the algorithm.`
              : 'Selection is optional. Keep "Run all folder data" if you want the full folder.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
