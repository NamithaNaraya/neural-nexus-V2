import React, { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { cn } from '../../../../utils/cn';

const TYPE_COLORS = [
  'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'border-primary/25 bg-primary/10 text-primary',
  'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300',
  'border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  'border-emerald-600/20 bg-emerald-600/5 text-emerald-800 dark:text-emerald-200',
];

export function DataSelectionModal({
  open,
  onClose,
  nodes,
  links,
  nodeTypes,
  relationshipTypes,
  selectedNodes,
  toggleNode,
  clearSelection,
}) {
  const [search, setSearch] = useState('');
  const [activeNodeTypes, setActiveNodeTypes] = useState([]);
  const [activeRelationshipTypes, setActiveRelationshipTypes] = useState([]);

  const visibleNodeIds = useMemo(() => {
    if (activeRelationshipTypes.length === 0) return null;
    const ids = new Set();
    links.forEach((link) => {
      if (activeRelationshipTypes.includes(link.type)) {
        ids.add(link.source);
        ids.add(link.target);
      }
    });
    return ids;
  }, [links, activeRelationshipTypes]);

  const filteredNodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return nodes.filter((node) => {
      const matchesTerm = !term || `${node.name || ''} ${node.type || ''} ${node.id || ''}`.toLowerCase().includes(term);
      const matchesType = activeNodeTypes.length === 0 || activeNodeTypes.includes(node.type);
      const matchesRelationship = !visibleNodeIds || visibleNodeIds.has(node.id);
      return matchesTerm && matchesType && matchesRelationship;
    });
  }, [nodes, search, activeNodeTypes, visibleNodeIds]);

  const nodesByType = useMemo(() => {
    return nodeTypes.map((type, index) => ({
      type,
      colorClass: TYPE_COLORS[index % TYPE_COLORS.length],
      nodes: filteredNodes.filter((node) => node.type === type),
    })).filter((group) => group.nodes.length > 0);
  }, [filteredNodes, nodeTypes]);

  if (!open) return null;

  function toggleFilter(value, values, setter) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function selectAllFiltered() {
    const ids = filteredNodes.map((node) => node.id);
    ids.forEach((id) => {
      if (!selectedNodes.includes(id)) toggleNode(id);
    });
  }

  function clearAllFiltered() {
    const ids = new Set(filteredNodes.map((node) => node.id));
    selectedNodes.forEach((id) => {
      if (ids.has(id)) toggleNode(id);
    });
  }

  function selectType(type) {
    filteredNodes
      .filter((node) => node.type === type)
      .forEach((node) => {
        if (!selectedNodes.includes(node.id)) toggleNode(node.id);
      });
  }

  function clearType(type) {
    filteredNodes
      .filter((node) => node.type === type && selectedNodes.includes(node.id))
      .forEach((node) => toggleNode(node.id));
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-[min(760px,92vh)] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Custom Data Selection</h2>
            <p className="text-sm text-muted-foreground">Isolate specific node and relationship clusters for targeted analysis.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[300px_1fr]">
          <div className="border-r border-border/30 bg-background/35 p-6 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Entity Discovery</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nodeTypes.map((type, index) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleFilter(type, activeNodeTypes, setActiveNodeTypes)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-300',
                      activeNodeTypes.includes(type)
                        ? TYPE_COLORS[index % TYPE_COLORS.length]
                        : 'border-border/50 bg-background/70 text-muted-foreground hover:border-emerald-500/30'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Relation Discovery</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {relationshipTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleFilter(type, activeRelationshipTypes, setActiveRelationshipTypes)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-300',
                      activeRelationshipTypes.includes(type)
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-border/50 bg-background/70 text-muted-foreground hover:border-emerald-500/30'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Selected Subset</p>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedNodes.length} units</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-left text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/10"
                  >
                    Select Visible
                  </button>
                  <button
                    type="button"
                    onClick={clearAllFiltered}
                    className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-left text-xs font-bold text-primary transition hover:bg-primary/10"
                  >
                    Clear Visible
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-left text-xs font-bold text-muted-foreground transition hover:border-emerald-500/40 hover:text-foreground"
                  >
                    Clear Global Selection
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-6">
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search entities by name or identifier..."
                className="h-11 rounded-xl border-border/60 bg-background/50 pl-11 focus:bg-background transition-colors"
              />
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-5">
                {nodesByType.map((group) => (
                  <div key={group.type} className="rounded-2xl border border-border/30 bg-background/20 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded-full border px-4 py-1 text-xs font-bold tracking-tight', group.colorClass)}>
                          {group.type}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground/60">{group.nodes.length}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button type="button" onClick={() => selectType(group.type)} className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                          Mass Select
                        </button>
                        <button type="button" onClick={() => clearType(group.type)} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                          Mass Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {group.nodes.map((node) => {
                        const active = selectedNodes.includes(node.id);

                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => toggleNode(node.id)}
                            className={cn(
                              'group relative rounded-2xl border px-4 py-3.5 text-left transition-all duration-300',
                              active
                                ? cn('shadow-lg shadow-black/5 ring-1 ring-emerald-500/20', group.colorClass)
                                : 'border-border/40 bg-background/35 hover:border-emerald-500/40 hover:bg-background/80'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground">{node.name || node.id}</p>
                                <p className="mt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{node.type || 'Entity'}</p>
                              </div>
                              <div className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300',
                                active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border/60 text-transparent group-hover:border-emerald-500/40'
                              )}>
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {filteredNodes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/40 bg-background/10 px-4 py-16 text-center">
                   <p className="text-sm font-bold text-muted-foreground">No entities match the current topography filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
