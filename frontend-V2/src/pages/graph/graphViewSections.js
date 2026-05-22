import { BarChart3, Box, Compass, Grid2x2, Layers, TableProperties, Waypoints, Zap, PieChart } from 'lucide-react';

export const knowledgeGraphSections = [
  {
    label: 'Knowledge Graph',
    items: [
      { path: '2d', label: '2D Graph', icon: Compass },
      { path: '3d', label: '3D Graph', icon: Box },
      { path: 'table', label: 'Table', icon: TableProperties },
    ],
  },
];

export const visualizeDataSections = [
  {
    label: 'Visualize Data',
    items: [
      { path: 'sunburst', label: 'Sunburst', icon: Layers },
      { path: 'treemap', label: 'Treemap', icon: Grid2x2 },
      { path: 'radar', label: 'Radar', icon: Zap },
      { path: 'distribution', label: 'Distribution', icon: PieChart },
      { path: 'degree', label: 'Degree', icon: BarChart3 },
      { path: 'matrix', label: 'Matrix', icon: Grid2x2 },
    ],
  },
];
