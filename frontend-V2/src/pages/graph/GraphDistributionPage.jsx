import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { filterGraphData } from './filterGraphData';
import { cn } from '../../utils/cn';

export default function GraphDistributionPage(props) {
  const { 
    graphData, 
    nodeTypeColors = {},
    nodeTypeFilters,
    relationshipTypeFilters,
    minDegree,
    showOrphans,
    nodeSearch
  } = props;

  // APPLY GLOBAL FILTERS
  const filteredGraph = useMemo(
    () => filterGraphData(graphData, { nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch }),
    [graphData, nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch]
  );

  const pieData = useMemo(() => {
    const counts = {};
    filteredGraph.nodes.forEach(n => {
      const t = n.type || 'Unknown';
      counts[t] = (counts[t] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredGraph]);

  if (!pieData.length) return null;

  return (
    <div className="h-full w-full flex flex-col p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={nodeTypeColors[entry.name] || 'hsl(var(--primary))'} 
                  style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))', opacity: 0.8 }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="bg-background/95 backdrop-blur-2xl border border-white/10 p-4 rounded-[24px] shadow-2xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">{data.name}</p>
                      <p className="text-2xl font-black text-foreground">{data.value}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* CENTER LABEL (Raw count only) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
           <span className="text-5xl font-black text-foreground/10 tracking-tighter">{filteredGraph.nodes.length}</span>
        </div>
      </div>
      
      <div className="mt-6 flex flex-wrap justify-center gap-4">
         {pieData.slice(0, 8).map((entry, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/2">
               <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: nodeTypeColors[entry.name], opacity: 0.5 }} />
               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{entry.name}</span>
            </div>
         ))}
      </div>
    </div>
  );
}
