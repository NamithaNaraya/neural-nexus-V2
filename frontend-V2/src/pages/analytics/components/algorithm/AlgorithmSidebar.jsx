import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Activity, Zap, Network, BrainCircuit } from 'lucide-react';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { cn } from '../../../../utils/cn';
import { ALGORITHM_CATALOG, ALGORITHM_GROUPS } from '../../algorithmCatalog';

export function AlgorithmSidebar({ selectedAlgorithmId, setSelectedAlgorithmId }) {
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(ALGORITHM_GROUPS.map((group) => [group.id, false]))
  );

  const filteredAlgorithms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ALGORITHM_CATALOG;
    return ALGORITHM_CATALOG.filter((algorithm) =>
      [algorithm.name, algorithm.group, algorithm.description].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [search]);

  const algorithmsByGroup = useMemo(() => {
    return ALGORITHM_GROUPS.map((group) => ({
      ...group,
      items: filteredAlgorithms.filter((algorithm) => algorithm.group === group.id),
    })).filter((group) => group.items.length > 0);
  }, [filteredAlgorithms]);

  function toggleGroup(groupId) {
    setOpenGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  return (
    <Card className="flex h-full min-h-0 flex-col border-border/20 bg-secondary/15 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-3xl rounded-[32px] ring-1 ring-white/10">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 p-6">
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Algorithm Library</div>
          <h2 className="text-xl font-black tracking-tighter text-foreground uppercase">Select Algorithm</h2>
        </div>

        <div className="relative group">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search algorithms..."
            className="h-12 pl-12 rounded-[20px] border-border/10 bg-secondary/20 focus:ring-4 focus:ring-primary/10 transition-all duration-500 font-bold tracking-tight shadow-inner"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
          {algorithmsByGroup.map((group) => {
            const expanded = search ? true : openGroups[group.id];
            const ToggleIcon = expanded ? ChevronDown : ChevronRight;

            return (
              <div key={group.id} className="rounded-[24px] border border-border/10 bg-white/30 backdrop-blur-md overflow-hidden transition-all duration-500">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left group/group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('h-3 w-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]', group.accent)} />
                    <span className="text-[13px] font-black uppercase tracking-widest text-foreground/80 group-hover/group:text-primary transition-colors">{group.label}</span>
                    <span className="rounded-lg bg-primary/5 px-2 py-0.5 text-[9px] font-black text-primary/50 border border-primary/10">{group.items.length}</span>
                  </div>
                  {!search && <ToggleIcon className="h-4.5 w-4.5 shrink-0 text-muted-foreground/30 transition-transform group-hover/group:text-primary" />}
                </button>

                {expanded && (
                  <div className="space-y-1.5 border-t border-border/10 px-2 py-3 bg-secondary/5">
                    {group.items.map((algorithm) => {
                      const active = selectedAlgorithmId === algorithm.id;
                      const Icon = algorithm.icon;

                      return (
                        <button
                          key={algorithm.id}
                          type="button"
                          onClick={() => setSelectedAlgorithmId(algorithm.id)}
                          className={cn(
                            'w-full rounded-[18px] border transition-all duration-500 px-3 py-3 text-left group/item',
                            active
                              ? 'border-primary/30 bg-primary/10 shadow-xl shadow-primary/5 ring-1 ring-primary/20'
                              : 'border-transparent hover:bg-white hover:shadow-md hover:translate-x-1'
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-500 bg-white/80 shadow-sm border-border/10',
                                active ? 'scale-110 -rotate-3 border-primary/20 bg-white shadow-primary/10' : 'group-hover/item:rotate-3'
                            )}>
                              <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground/40')} />
                            </div>
                            <div className="min-w-0">
                                <p className={cn(
                                    "truncate text-[14px] font-black tracking-tight",
                                    active ? "text-primary uppercase" : "text-foreground"
                                )}>{algorithm.name}</p>
                                <p className="mt-1 line-clamp-2 text-[11px] font-bold text-muted-foreground/50 leading-relaxed">{algorithm.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
