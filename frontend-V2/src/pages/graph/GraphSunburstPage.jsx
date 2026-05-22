import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent } from '../../components/ui/Card';
import { graphService } from '../../services/graphService';
import { filterGraphData } from './filterGraphData';
import { capGraphData } from './graphDisplayData';
import { VISUAL_PALETTE } from '../../utils/visualPalette';

function buildSunburstHierarchy(nodes) {
  const grouped = new Map();
  nodes.forEach((node) => {
    const type = node.type || 'Unknown';
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type).push(node);
  });

  const children = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([type, typeNodes]) => {
      const sortedNodes = [...typeNodes].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
      const limitedNodes = sortedNodes.slice(0, 80);
      const nodeChildren = limitedNodes.map((node) => ({
        name: node.name || node.id,
        id: node.id,
        value: 1,
      }));
      return { name: type, value: typeNodes.length, children: nodeChildren };
    });

  return { name: 'Graph', children };
}

export default function GraphSunburstPage(props) {
  const {
    folderId,
    graphData: graphDataProp = null,
    nodeTypeFilters,
    relationshipTypeFilters,
    minDegree,
    showOrphans,
    nodeSearch,
    nodeTypeColors = {}
  } = props;
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!folderId) {
          setGraphData({ nodes: [], links: [] });
          return;
        }
        if (graphDataProp) {
          setGraphData(graphDataProp);
          return;
        }
        const response = await graphService.getFolder(folderId, 10000);
        setGraphData(response || { nodes: [], links: [] });
      } catch (err) {
        setGraphData({ nodes: [], links: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [folderId, graphDataProp]);

  const filteredGraph = useMemo(
    () => filterGraphData(graphData, { nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch }),
    [graphData, nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans, nodeSearch]
  );

  const renderedGraph = useMemo(() => capGraphData(filteredGraph, 12000), [filteredGraph]);
  const sunburstData = useMemo(() => buildSunburstHierarchy(renderedGraph.nodes), [renderedGraph.nodes]);

  useEffect(() => {
    if (!wrapperRef.current) return undefined;
    const node = wrapperRef.current;
    const updateWidth = () => setContainerWidth(node.clientWidth || 0);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (!sunburstData.children.length) return;

    const width = Math.max(containerWidth || 0, 720);
    const height = 640;
    const radius = Math.min(width, height) / 2 - 40;

    const root = d3
      .hierarchy(sunburstData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.partition().size([2 * Math.PI, radius])(root);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle(0.01)
      .padRadius(radius / 3)
      .innerRadius((d) => d.y0 + (d.depth === 1 ? 25 : 0))
      .outerRadius((d) => Math.max(d.y0 + 25, d.y1 - 5));

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const segments = root.descendants().filter((d) => d.depth > 0 && (d.x1 - d.x0) > 0.01);

    g.selectAll('path')
      .data(segments)
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => {
        const type = d.depth === 1 ? d.data.name : d.ancestors().find((ancestor) => ancestor.depth === 1)?.data.name;
        const baseColor = nodeTypeColors[type] || VISUAL_PALETTE[0];
        return d.depth === 1 ? baseColor : d3.color(baseColor)?.brighter(0.8).formatHex() || baseColor;
      })
      .attr('stroke', 'rgba(255,255,255,0.05)')
      .attr('stroke-width', 1)
      .style('opacity', 0.85)
      .append('title')
      .text((d) => `${d.data.name}: ${d.value}`);

    const topLevelLabels = root.descendants().filter((d) => d.depth === 1 && (d.x1 - d.x0) > 0.22);
    g.selectAll('text')
      .data(topLevelLabels)
      .join('text')
      .attr('transform', (d) => {
        const angle = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
        const y = (d.y0 + d.y1) / 2 + 10;
        return `rotate(${angle - 90}) translate(${y},0) rotate(${angle < 180 ? 0 : 180})`;
      })
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 900)
      .attr('fill', 'hsl(var(--foreground) / 0.6)')
      .attr('class', 'uppercase tracking-widest')
      .text((d) => d.data.name);

    const center = g.append('g').attr('text-anchor', 'middle');
    center.append('circle').attr('r', 65).attr('fill', 'rgba(255,255,255,0.01)').attr('stroke', 'rgba(255,255,255,0.03)').attr('stroke-width', 1);
    center.append('text').attr('y', 15).attr('font-size', 36).attr('font-weight', 900).attr('fill', 'hsl(var(--foreground))').attr('opacity', 0.15).text(renderedGraph.nodes.length);
  }, [containerWidth, loading, renderedGraph.nodes.length, sunburstData, nodeTypeColors]);

  return (
    <div className="h-full w-full flex items-center justify-center p-4 min-h-[600px] animate-in fade-in duration-1000">
      <div ref={wrapperRef} className="w-full max-w-4xl mx-auto relative">
        {loading && (
           <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 rounded-full">
              <div className="h-10 w-10 border-t-2 border-primary animate-spin rounded-full" />
           </div>
        )}
        <svg ref={svgRef} className="h-[640px] w-full" preserveAspectRatio="xMidYMid meet" />
      </div>
    </div>
  );
}
