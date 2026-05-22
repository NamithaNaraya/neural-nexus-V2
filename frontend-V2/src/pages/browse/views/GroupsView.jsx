import React from 'react';
import { ArrowUpRight, Boxes } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent } from '../../../components/ui/Card';
import { cn } from '../../../utils/cn';
import { getNodeName, getNodeType, getTypeStyle } from '../helpers';

export function GroupsView({ groups }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => {
        const style = getTypeStyle(group.type);

        return (
          <Card key={group.type} className="overflow-hidden border-border/60 bg-card/70 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
            <div className={cn('h-24 bg-gradient-to-br', style.glow)} />
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border', style.icon)}>
                      <Boxes className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{group.type}</h3>
                      <p className="text-sm text-muted-foreground">{group.items.length} visible records in this deck</p>
                    </div>
                  </div>
                </div>
                <Badge className={style.chip}>{group.items.length} items</Badge>
              </div>

              <div className="grid gap-2">
                {group.items.slice(0, 5).map((node, index) => (
                  <div key={node.id || `${getNodeType(node)}-${index}`} className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/35 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{getNodeName(node)}</p>
                      <p className="text-xs text-muted-foreground">{node.id || 'No id available'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>deg {node.degree ?? 0}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
