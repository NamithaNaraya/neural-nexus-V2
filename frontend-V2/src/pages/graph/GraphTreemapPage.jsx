import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { graphService } from '../../services/graphService';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { filterGraphData } from './filterGraphData';
import { capGraphData } from './graphDisplayData';
import { cn } from '../../utils/cn';

const CustomTreeMapContent = (props) => {
  const { root, depth, x, y, width, height, index, payload, name, colors = {} } = props;
  
  const type = payload?.type || 'Unknown';
  const color = colors[type] || colors[name] || 'hsl(var(--primary) / 0.4)';

  // CRITICAL FIX: Only show labels for LEAF nodes (depth 1)
  // Recharts treemap levels: Root is depth 0, children are depth 1.
  const isLeaf = depth === 1;
  const shouldShowLabel = isLeaf && width > 70 && height > 35;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        ry={2}
        style={{
          fill: color,
          stroke: '#000', // Darker border for definition
          strokeWidth: 1.5,
          strokeOpacity: 0.25, // Increased visibility
          opacity: isLeaf ? 0.85 : 0.1,
          transition: 'all 0.4s ease'
        }}
      />
      {shouldShowLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={Math.min(width / 12, 10)}
          fontWeight="900"
          className="uppercase tracking-widest opacity-95 pointer-events-none select-none drop-shadow-md"
        >
          {name.length > width / 7 ? `${name.substring(0, Math.floor(width / 9))}...` : name}
        </text>
      )}
    </g>
  );
};

export default function GraphTreemapPage(props) {
  const {
    folderId,
    nodeTypeFilters,
    relationshipTypeFilters,
    minDegree,
    showOrphans,
    nodeSearch,
    nodeTypeColors = {}
  } = props;

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!folderId) {
          setGraphData({ nodes: [], links: [], total_nodes: 0, total_links: 0 });
        } else {
          const data = await graphService.getFolder(folderId, 10000);
          setGraphData(data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [folderId]);

  const filteredGraph = useMemo(
    () => filterGraphData(graphData, { nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch }),
    [graphData, nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch]
  );

  const renderedGraph = useMemo(() => capGraphData(filteredGraph, 12000), [filteredGraph]);

  const treeData = useMemo(() => {
    const groups = {};
    renderedGraph.nodes.forEach((n) => {
      const type = n.type || 'Unknown';
      groups[type] = groups[type] || { name: type, children: [], type };
      groups[type].children.push({ name: n.label || n.name || n.id, value: 1, type });
    });
    return Object.values(groups).map((group) => ({
      ...group,
      children: group.children.slice(0, 180)
    }));
  }, [renderedGraph.nodes]);

  return (
    <div className="h-full w-full flex flex-col space-y-4 overflow-hidden bg-background/5 p-4 rounded-[32px]">
      <div className="flex-1 min-h-0 w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-t-2 border-primary animate-spin" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/30">Analyzing Data Blocks</p>
             </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treeData}
              dataKey="value"
              ratio={4 / 3}
              stroke="#000"
              content={<CustomTreeMapContent colors={nodeTypeColors} />}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1.5">{data.type || 'Category'}</p>
                        <p className="text-xs font-bold text-foreground/80">{data.name}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
