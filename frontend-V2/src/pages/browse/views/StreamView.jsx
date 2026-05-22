import React from 'react';
import { ArrowRight, Orbit, Radar, ScanSearch } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent } from '../../../components/ui/Card';
import { cn } from '../../../utils/cn';
import { getNodeDescription, getNodeName, getNodePropertyEntries, getNodeType, getTypeStyle } from '../helpers';

export function StreamView({ nodes, onOpenInGraph = null }) {
  return (
    <div className="space-y-3">
      {nodes.map((node, index) => {
        const type = getNodeType(node);
        const style = getTypeStyle(type);
        const entries = getNodePropertyEntries(node);

        return (
          <Card key={node.id || `${type}-${index}`} className="overflow-hidden border-border/60 bg-card/70 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
            <div className={cn('h-1.5 w-full bg-gradient-to-r', style.glow)} />
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr_auto] lg:items-center">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={style.chip}>{type}</Badge>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{node.id || 'No id'}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{getNodeName(node)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{getNodeDescription(node)}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {entries.length > 0 ? entries.map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-border/40 bg-background/35 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{key}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{String(value)}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border/40 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                    No extra node properties to preview.
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <div className="rounded-2xl border border-border/40 bg-background/35 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Graph degree</p>
                  <p className="mt-1 text-2xl font-semibold">{node.degree ?? 0}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenInGraph?.(node)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary transition hover:bg-primary/12"
                  title="Open this node in Graph view"
                >
                  <Radar className="h-3.5 w-3.5" />
                  Open in graph
                </button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Orbit className="h-3.5 w-3.5" />
                  Connected entity
                </div>
                <div className="flex items-center gap-2 text-xs text-primary">
                  <ScanSearch className="h-3.5 w-3.5" />
                  Browse detail ready
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
