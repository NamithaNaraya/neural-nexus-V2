import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '../../components/ui/Card';
import { graphService } from '../../services/graphService';
import { Skeleton } from '../../components/ui/Skeleton';
import { filterGraphData } from './filterGraphData';
import { capGraphData } from './graphDisplayData';
import { BRAND_COLORS } from '../../utils/visualPalette';

function StatCard({ label, value, accentClass = 'text-foreground' }) {
  return (
    <Card variant="branded" className="border-border/60 bg-card/80 shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <p className={`mt-2 text-3xl font-semibold ${accentClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function GraphDegreeDistributionPage(props) {
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

  const degreeData = useMemo(() => {
    const degrees = {};
    renderedGraph.nodes.forEach((node) => {
      const degree = node.degree || 0;
      degrees[degree] = (degrees[degree] || 0) + 1;
    });

    return Object.entries(degrees)
      .map(([degree, count]) => ({ degree: parseInt(degree, 10), count }))
      .sort((a, b) => a.degree - b.degree)
      .slice(0, 30);
  }, [renderedGraph.nodes]);

  const maxDegree = Math.max(...renderedGraph.nodes.map((node) => node.degree || 0), 0);
  const avgDegree = renderedGraph.nodes.length > 0
    ? (renderedGraph.nodes.reduce((sum, node) => sum + (node.degree || 0), 0) / renderedGraph.nodes.length).toFixed(2)
    : '0.00';
  const orphanCount = renderedGraph.nodes.filter((node) => !node.degree || node.degree === 0).length;
  const hubCount = renderedGraph.nodes.filter((node) => (node.degree || 0) > 5).length;

  return (
    <div className="space-y-5 p-1">
      {loading ? (
        <>
          <Skeleton className="h-[30rem] rounded-2xl" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          <Card variant="branded" className="border-border/60 bg-card/85 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Degree distribution</div>
                <p className="text-sm text-muted-foreground">
                  Cleaner view of how many nodes exist at each connection level.
                </p>
              </div>

              <div className="h-[430px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={degreeData} margin={{ top: 12, right: 20, left: 6, bottom: 34 }}>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(148,163,184,0.12)" />
                    <XAxis
                      dataKey="degree"
                      tick={{ fontSize: 11, fill: '#7cac94', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
                      tickMargin={12}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#7cac94', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--primary) / 0.04)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        border: '1px solid hsl(var(--primary) / 0.12)',
                        borderRadius: '16px',
                        boxShadow: '0 20px 50px rgba(15,23,42,0.06)',
                        backdropFilter: 'blur(8px)'
                      }}
                      formatter={(value) => [`${value} nodes`, 'Count']}
                      labelFormatter={(label) => `Degree ${label}`}
                    />
                    <Bar
                      dataKey="count"
                      fill={BRAND_COLORS.emerald}
                      radius={[8, 8, 0, 0]}
                      barSize={42}
                      name="Count"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Max Degree" value={maxDegree} />
            <StatCard label="Avg Degree" value={avgDegree} accentClass="text-primary" />
            <StatCard label="Orphans" value={orphanCount} accentClass="text-primary dark:text-primary" />
            <StatCard label="Hubs > 5" value={hubCount} accentClass="text-primary" />
          </div>
        </>
      )}
    </div>
  );
}
