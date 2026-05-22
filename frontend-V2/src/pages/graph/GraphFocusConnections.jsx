import React, { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, Network } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

function resolveNode(value) {
  if (!value) return { id: '', label: '' };
  if (typeof value === 'object') {
    return {
      id: value.id || value.name || '',
      label: value.name || value.label || value.id || '',
    };
  }
  return { id: value, label: value };
}

function buildRelationshipGroups(links = [], activeNodeId) {
  const groups = new Map();

  links.forEach((link, index) => {
    const source = resolveNode(link.source);
    const target = resolveNode(link.target);
    const isOutgoing = String(source.id) === String(activeNodeId);
    const counterpart = isOutgoing ? target : source;
    const direction = isOutgoing ? 'Outgoing' : 'Incoming';
    const type = link.type || 'Relationship';
    const key = `${type}::${direction}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        type,
        direction,
        count: 0,
        items: [],
      });
    }

    const group = groups.get(key);
    group.count += 1;
    group.items.push({
      ...link,
      _key: `${link.id || index}-${source.id}-${target.id}-${type}`,
      source,
      target,
      counterpart,
      direction,
    });
  });

  return [...groups.values()].sort((left, right) => {
    if (left.type === right.type) return left.direction.localeCompare(right.direction);
    return left.type.localeCompare(right.type);
  });
}

export function GraphFocusConnections({ activeNode = null, links = [], onSelectLink }) {
  const relationshipGroups = useMemo(
    () => buildRelationshipGroups(links, activeNode?.id),
    [links, activeNode?.id]
  );

  if (!links.length) return null;

  return (
    <Card className="border-border/60 bg-card/60 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Relationship groups</h3>
            <p className="text-xs text-muted-foreground">
              Grouped like Neo4j Browser so same relationship names stay together.
            </p>
          </div>
          <Badge variant="outline">{links.length}</Badge>
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {relationshipGroups.map((group) => (
            <div key={group.key} className="rounded-2xl border border-border/40 bg-background/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-semibold">{group.type}</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{group.direction}</div>
                  </div>
                </div>
                <Badge variant="outline">{group.count}</Badge>
              </div>

              <div className="mt-3 space-y-2">
                {group.items.map((link) => (
                  <button
                    key={link._key}
                    type="button"
                    onClick={() => onSelectLink?.(link)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/40 bg-white px-3 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{link.source.label || link.source.id}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{link.target.label || link.target.id}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {group.direction} to {link.counterpart.label || link.counterpart.id}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
