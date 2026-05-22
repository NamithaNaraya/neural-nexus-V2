import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent } from '../../../components/ui/Card';

export function BrowseSummary({
  resultCount,
  currentFolder,
  activeType,
  selectedTypeMeta,
  page,
  totalPages,
}) {
  const summaryItems = [
    { label: 'Visible items', value: resultCount.toLocaleString() },
    { label: 'Folder scope', value: currentFolder?.name || 'All folders' },
    { label: 'Type scope', value: activeType === 'all' ? 'All types' : activeType },
    { label: 'Page', value: `${page} / ${totalPages}` },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
      <Card className="border-border/60 bg-card/65 backdrop-blur-xl">
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {selectedTypeMeta && activeType !== 'all' && (
          <Badge className="border-primary/30 bg-primary/10 px-3 py-1 text-primary">
            {selectedTypeMeta.count} known nodes in {activeType}
          </Badge>
        )}
        <Badge variant="secondary" className="px-3 py-1">
          Shared filter state active
        </Badge>
      </div>
    </div>
  );
}
