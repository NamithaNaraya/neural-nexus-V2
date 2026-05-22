import React from 'react';
import { Radar } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent } from '../../../components/ui/Card';
import { getNodeName, getNodePropertyCount, getNodeType, getTypeStyle } from '../helpers';

export function TableView({ nodes, onOpenInGraph = null }) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/70 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/25 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-medium">Entity</th>
                <th className="px-5 py-4 font-medium">Type</th>
                <th className="px-5 py-4 font-medium">Degree</th>
                <th className="px-5 py-4 font-medium">Fields</th>
                <th className="px-5 py-4 font-medium">Identifier</th>
                <th className="px-5 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node, index) => {
                const type = getNodeType(node);
                const style = getTypeStyle(type);

                return (
                  <tr key={node.id || `${type}-${index}`} className="border-t border-border/40">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold">{getNodeName(node)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{node.description || 'Graph entity record'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={style.chip}>{type}</Badge>
                    </td>
                    <td className="px-5 py-4 font-medium">{node.degree ?? 0}</td>
                    <td className="px-5 py-4 font-medium">{getNodePropertyCount(node)}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{node.id || 'n/a'}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenInGraph?.(node)}
                        className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary transition hover:bg-primary/12"
                        title="Open this node in Graph view"
                      >
                        <Radar className="h-3.5 w-3.5" />
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
