import React, { useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip 
} from 'recharts';
import { filterGraphData } from './filterGraphData';
import { cn } from '../../utils/cn';

export default function GraphRadarPage(props) {
  const { 
    graphData, 
    nodeTypeColors = {},
    nodeTypeFilters,
    relationshipTypeFilters,
    minDegree,
    showOrphans,
    nodeSearch
  } = props;

  const filteredGraph = useMemo(
    () => filterGraphData(graphData, { nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch }),
    [graphData, nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch]
  );

  const radarData = useMemo(() => {
    const counts = {};
    filteredGraph.nodes.forEach(n => {
      const t = n.type || 'Unknown';
      counts[t] = (counts[t] || 0) + 1;
    });

    return Object.entries(counts).map(([type, value]) => ({
      subject: type,
      A: value,
      fullMark: Math.max(...Object.values(counts)) * 1.2,
    }));
  }, [filteredGraph]);

  if (!radarData.length) return null;

  return (
    <div className="h-full w-full flex flex-col p-6 animate-in zoom-in duration-700">
      <div className="flex-1 min-h-0 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="hsl(var(--primary) / 0.1)" strokeDasharray="3 3" />
            <PolarAngleAxis 
               dataKey="subject" 
               tick={{ fill: 'hsl(var(--muted-foreground) / 0.5)', fontSize: 10, fontWeight: 900 }}
            />
            <PolarRadiusAxis 
               angle={30} 
               domain={[0, 'auto']} 
               tick={{ fill: 'hsl(var(--primary) / 0.2)', fontSize: 8 }}
            />
            <Radar
              dataKey="A"
              stroke="hsl(var(--primary) / 0.6)"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
            />
            <Tooltip 
               content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">{payload[0].payload.subject}</p>
                        <p className="text-xl font-black text-foreground">{payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
               }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
