import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Network, Search, ArrowUpRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../utils/cn';

export function FolderNodesPanel({
  active,
  folderContentSearch,
  setFolderContentSearch,
  nodeTypes,
  selectedNodeType,
  setSelectedNodeType,
  selectedFolder,
  nodeSearch,
  setNodeSearch,
  fetchFolderNodes,
  nodesLoading,
  filteredFolderNodes,
}) {
  const navigate = useNavigate();
  
  const handleNodeClick = (node) => {
    if (!node?.id) return;
    // Deep link to graph 2D view with explorer flag
    navigate(`/graph/2d?exploreId=${node.id}`);
  };
  const getFolderThemeTone = (active) => ({
    backgroundColor: active ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
    borderColor: active ? 'hsl(var(--primary))' : 'hsl(var(--border))',
    color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--secondary-foreground))',
  });

  return (
    <section
      aria-hidden={!active}
      className={cn(
        'transition-opacity duration-200 ease-out motion-reduce:transition-none',
        active
          ? 'z-10 opacity-100 flex-1 flex flex-col min-h-0'
          : 'z-0 pointer-events-none opacity-0 h-0 overflow-hidden'
      )}
    >
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Graph nodes</h3>
          <p className="text-xs text-muted-foreground">Pick a type and search within the selected folder.</p>
        </div>
        <Input
          value={folderContentSearch}
          onChange={(e) => setFolderContentSearch(e.target.value)}
          placeholder="Search nodes..."
          className="h-10 w-full lg:max-w-sm"
        />
        </div>

        <div className="relative">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar-horizontal scroll-smooth no-scrollbar relative z-10">
            {nodeTypes.length > 0 ? nodeTypes.map((nodeType) => {
              const isSelected = selectedNodeType === nodeType.type;
              return (
                <button
                  key={nodeType.type}
                  type="button"
                  onClick={() => {
                    setSelectedNodeType(nodeType.type);
                    fetchFolderNodes(selectedFolder.id, nodeType.type, 1, nodeSearch);
                  }}
                  className={cn(
                    'rounded-xl border px-3 py-1 text-[10px] font-bold transition-all duration-300 shrink-0',
                    isSelected
                      ? 'text-white shadow-lg shadow-primary/20 scale-105'
                      : 'bg-accent-soft/10 text-muted-foreground hover:bg-accent-soft/30 hover:text-foreground'
                  )}
                  style={getFolderThemeTone(isSelected)}
                >
                  {nodeType.type} ({nodeType.count})
                </button>
              );
            }) : (
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No types found.</span>
            )}
          </div>
          <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-background/40 to-transparent pointer-events-none z-20" />
        </div>

        <div className="relative flex-1 min-h-0 space-y-2 overflow-y-auto pr-3 pb-24 transition-colors [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-primary/5 [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/50">
          <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 shadow-inner opacity-50" />
          {nodesLoading && filteredFolderNodes.length > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-end pb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm backdrop-blur-md">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </span>
            </div>
          )}

          {nodesLoading && filteredFolderNodes.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((x) => (
                <Skeleton key={x} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : filteredFolderNodes.length > 0 ? (
            filteredFolderNodes.map((node) => (
              <div 
                key={node.id} 
                className="group relative flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 dark:bg-black/40 px-4 py-3 transition-all hover:bg-white/20 dark:hover:bg-white/10 hover:border-primary/30 dark:border-white/5 dark:hover:border-white/20 hover:shadow-[0_8px_32px_-8px_rgba(45,58,40,0.1)] hover:-translate-y-0.5 backdrop-blur-md shadow-inner"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-black tracking-tight text-foreground/70 group-hover:text-primary transition-colors">
                    {node.name || node.id || 'Unnamed Entity'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                     <div className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">{node.type || 'Unknown'}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleNodeClick(node)}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                  title="View in Graph"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-border/20 bg-muted/10 p-4 text-sm text-muted-foreground">
              No matching nodes found.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
