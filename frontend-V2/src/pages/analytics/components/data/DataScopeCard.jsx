import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Database, FolderOpen, Network, Target, Layers, GitFork } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';
import { cn } from '../../../../utils/cn';
import { DataSelectionModal } from './DataSelectionModal';
import { Badge } from '../../../../components/ui/Badge';

export function DataScopeCard({
  collapsed,
  onToggleCollapsed,
  currentFolder,
  graphStats,
  nodeTypes,
  relationshipTypes,
  folderNodes,
  folderLinks,
  runFullFolder,
  setRunFullFolder,
  selectedNodes,
  toggleNode,
  clearSelection,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  if (collapsed) {
    return (
      <>
        <Card className="border-border/20 bg-secondary/15 shadow-sm backdrop-blur-[40px] rounded-[24px] ring-1 ring-white/10 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Data Scope</div>
                <h3 className="text-sm font-black tracking-tight text-foreground uppercase truncate mt-0.5">
                  {currentFolder?.name || 'No Dataset'} • <span className="text-[11px] text-muted-foreground/50 font-bold lowercase tracking-normal">
                    {runFullFolder
                      ? `${graphStats.nodes.toLocaleString()} nodes`
                      : `${selectedNodes.length} selected`}
                  </span>
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-border/15 bg-secondary/10 text-muted-foreground/40 transition-all duration-300 hover:bg-primary/10 hover:text-primary shrink-0"
              aria-label="Show Scope"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>

        <DataSelectionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          nodes={folderNodes}
          links={folderLinks}
          nodeTypes={nodeTypes}
          relationshipTypes={relationshipTypes}
          selectedNodes={selectedNodes}
          toggleNode={toggleNode}
          clearSelection={clearSelection}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-border/20 bg-secondary/15 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-[40px] rounded-[32px] ring-1 ring-white/10 overflow-hidden">
        <CardContent className="space-y-6 p-8">
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Step 2</div>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black tracking-tighter text-foreground uppercase">Data Scope</h2>
                <p className="text-[12px] font-bold text-muted-foreground/50 tracking-tight">Define the data boundaries for your analysis</p>
              </div>
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="h-11 w-11 flex items-center justify-center rounded-[18px] border border-border/15 bg-secondary/10 text-muted-foreground/40 transition-all duration-300 hover:bg-primary/10 hover:text-primary"
                aria-label={collapsed ? 'Show Scope' : 'Hide Scope'}
              >
                {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-8 animate-fade-in">
            {/* Folder Origin */}
            <div className="rounded-[28px] border border-border/10 bg-secondary/5 p-7 shadow-inner">
                <div className="flex items-center gap-4 mb-5 border-b border-border/10 pb-5">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Data Source</span>
                    <p className="text-base font-black tracking-tight text-foreground/90 uppercase">{currentFolder?.name || 'No Dataset Selected'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[22px] border border-border/10 bg-white/40 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Total Nodes</p>
                    <p className="text-xl font-black text-foreground tracking-tighter">{graphStats.nodes.toLocaleString()}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/10 bg-white/40 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Connections</p>
                    <p className="text-xl font-black text-foreground tracking-tighter">{graphStats.links.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Mode Control */}
              <div className="rounded-[28px] border border-border/10 bg-white/30 backdrop-blur-md p-7 shadow-xl ring-1 ring-white/10">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="h-12 w-12 rounded-2xl bg-secondary/30 flex items-center justify-center shadow-inner border border-border/10">
                       <Layers className="h-6 w-6 text-muted-foreground/60" />
                     </div>
                     <div>
                      <h3 className="text-[15px] font-black text-foreground uppercase tracking-tight">Full Dataset Processing</h3>
                      <p className="text-[11px] font-bold text-muted-foreground/40 tracking-tight">Disable for selective node analysis</p>
                     </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRunFullFolder((current) => !current)}
                    className={cn(
                      'group relative h-8 w-14 rounded-full transition-all duration-500 ring-4 ring-transparent',
                      runFullFolder ? 'bg-primary ring-primary/10 shadow-lg shadow-primary/25' : 'bg-muted-foreground/20'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-500',
                      runFullFolder ? 'left-[26px] scale-90' : 'left-1 scale-75 opacity-80'
                    )} />
                  </button>
                </div>

                {!runFullFolder && (
                  <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Button 
                      variant="outline" 
                      className="w-full h-14 rounded-[20px] border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-widest text-[11px] hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm" 
                      onClick={() => setModalOpen(true)}
                    >
                      Select Custom Nodes
                    </Button>
                    <div className="rounded-[22px] border border-border/10 bg-secondary/10 px-6 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Database className="h-5 w-5 text-primary/60" />
                        <div>
                          <p className="text-[13px] font-black text-foreground/80 lowercase tracking-tight">{selectedNodes.length} selected nodes</p>
                          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Custom Selection Active</p>
                        </div>
                      </div>
                      <button onClick={clearSelection} className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/60 hover:text-destructive transition-colors">Clear</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Taxonomy Summary */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] border border-border/10 bg-secondary/5 p-6 shadow-inner">
                  <div className="flex items-center gap-3 mb-4">
                    <Network className="h-4.5 w-4.5 text-primary/60" />
                    <span className="text-[11px] font-black text-foreground/80 uppercase tracking-widest">Node Taxonomy</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nodeTypes.slice(0, 8).map((type) => (
                      <Badge key={type} className="bg-white/60 text-[9px] font-bold text-muted-foreground/70 border-border/10 uppercase py-1 px-2.5 rounded-lg tracking-wider">
                        {type}
                      </Badge>
                    ))}
                    {nodeTypes.length > 8 && (
                      <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-1 pt-1.5">
                        +{nodeTypes.length - 8} More
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-border/10 bg-secondary/5 p-6 shadow-inner">
                  <div className="flex items-center gap-3 mb-4">
                    <GitFork className="h-4.5 w-4.5 text-primary/60 rotate-90" />
                    <span className="text-[11px] font-black text-foreground/80 uppercase tracking-widest">Relation types</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {relationshipTypes.slice(0, 8).map((type) => (
                      <Badge key={type} className="bg-white/60 text-[9px] font-bold text-muted-foreground/70 border-border/10 uppercase py-1 px-2.5 rounded-lg tracking-wider">
                        {type}
                      </Badge>
                    ))}
                    {relationshipTypes.length > 8 && (
                      <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest ml-1 pt-1.5">
                        +{relationshipTypes.length - 8} More
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </CardContent>
      </Card>

      <DataSelectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        nodes={folderNodes}
        links={folderLinks}
        nodeTypes={nodeTypes}
        relationshipTypes={relationshipTypes}
        selectedNodes={selectedNodes}
        toggleNode={toggleNode}
        clearSelection={clearSelection}
      />
    </>
  );
}
