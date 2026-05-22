import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { graphService } from '../../services/graphService';
import { Skeleton } from '../../components/ui/Skeleton';
import { filterGraphData } from './filterGraphData';
import { capGraphData } from './graphDisplayData';
import { getNodeTypeColor, getRelationshipTypeColor } from './colorSystem';

function SummaryCard({ label, value, accentClass = 'text-foreground' }) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">{label}</p>
        <p className={`mt-3 text-4xl font-[900] tracking-tighter ${accentClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function GraphSchemaExplorerPage(props) {
  const {
    folderId,
    nodeTypeFilters,
    relationshipTypeFilters,
    minDegree,
    showOrphans,
    nodeSearch,
  } = props;
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!folderId) {
          setGraphData({ nodes: [], links: [] });
          return;
        }
        const data = await graphService.getFolder(folderId, 10000);
        setGraphData(data);
      } catch (err) {
        console.error('Failed to load graph:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [folderId]);

  const filteredGraph = useMemo(
    () => filterGraphData(graphData, { nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch }),
    [graphData, nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch]
  );

  const renderedGraph = useMemo(() => capGraphData(filteredGraph, 12000), [filteredGraph]);

  const schema = useMemo(() => {
    const nodeTypeCounts = {};
    const relTypeCounts = {};

    renderedGraph.nodes.forEach((node) => {
      const type = node.type || 'Unknown';
      nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1;
    });

    renderedGraph.links.forEach((link) => {
      const type = link.type || 'UNKNOWN';
      relTypeCounts[type] = (relTypeCounts[type] || 0) + 1;
    });

    return { nodeTypeCounts, relTypeCounts };
  }, [renderedGraph.nodes, renderedGraph.links]);

  const sortedNodeTypes = Object.entries(schema.nodeTypeCounts).sort((a, b) => b[1] - a[1]);
  const sortedRelTypes = Object.entries(schema.relTypeCounts).sort((a, b) => b[1] - a[1]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Node Types" value={sortedNodeTypes.length} />
        <SummaryCard label="Total Nodes" value={filteredGraph.nodes.length} accentClass="text-primary" />
        <SummaryCard label="Relationship Types" value={sortedRelTypes.length} />
        <SummaryCard label="Total Links" value={filteredGraph.links.length} />
      </div>

      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">Node Network</h2>
              <p className="mt-1 text-[13px] font-bold text-muted-foreground/40 italic">Most common entity groups in the current filtered dataset.</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm backdrop-blur-md">
              {sortedNodeTypes.length} groups
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedNodeTypes.map(([type, count], index) => {
              const itemColor = getNodeTypeColor(type);
              return (
                <div
                  key={type}
                  className="group relative rounded-[24px] border border-white/10 bg-white/5 dark:bg-black/10 p-5 shadow-sm transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 dark:hover:bg-white/5 hover:border-primary/30 backdrop-blur-md"
                  style={{ borderLeftColor: itemColor, borderLeftWidth: 6 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-[900] tracking-tight text-foreground/80 group-hover:text-primary transition-colors">{type}</p>
                      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/30">{count} nodes in view</p>
                    </div>
                    <div
                      className="flex h-12 min-w-12 items-center justify-center rounded-[18px] text-[15px] font-black text-white shadow-xl shadow-primary/10 transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundColor: itemColor }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">Connection Flow</h2>
              <p className="mt-1 text-[13px] font-bold text-muted-foreground/40 italic">Connection patterns ranked by how often they appear after filtering.</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm backdrop-blur-md">
              {sortedRelTypes.length} kinds
            </div>
          </div>

          <div className="space-y-4">
            {sortedRelTypes.map(([type, count], index) => {
              const maxCount = sortedRelTypes[0]?.[1] || 1;
              const width = `${Math.max(12, (count / maxCount) * 100)}%`;
              const itemColor = getRelationshipTypeColor(type);

              return (
                <div
                  key={type}
                  className="group rounded-[24px] border border-white/5 bg-white/5 dark:bg-black/10 p-6 shadow-sm transition-all duration-500 hover:bg-white/10 dark:hover:bg-white/5 backdrop-blur-md"
                  style={{ borderLeftColor: itemColor, borderLeftWidth: 6 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black uppercase tracking-[0.2em] text-foreground/80 group-hover:text-primary transition-colors">{type}</p>
                      <p className="mt-2 text-[11px] font-bold text-muted-foreground/30">{count} active links</p>
                    </div>
                    <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary shadow-inner">
                      {count} links
                    </div>
                  </div>
                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-secondary/20 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(74,103,65,0.3)]"
                      style={{
                        width,
                        backgroundColor: itemColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
