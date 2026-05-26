import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { useGlobalFolder } from '../../contexts/GlobalFolderContext';
import { usePredictedLinks } from '../../contexts/PredictedLinksContext';
import { graphService } from '../../services/graphService';
import { GraphViewsNavigation } from '../graph/GraphViewsNavigation';
import { visualizeDataSections } from '../graph/graphViewSections';
import { mergePredictedLinks } from '../graph/mergePredictedLinks';
import { VisualizePageSkeleton } from '../../components/skeletons/RoutePageSkeleton';
import { getNodeTypeColor, getRelationshipTypeColor } from '../graph/colorSystem';
import { 
  Search, Filter, RotateCcw, CheckSquare, Square, Network, ChevronRight, Share2, Info, CheckCircle2, Circle, PanelLeftClose, SlidersHorizontal
} from 'lucide-react';
import { cn } from '../../utils/cn';

const GraphSunburstPage = lazy(() => import('../graph/GraphSunburstPage'));
const GraphTreemapPage = lazy(() => import('../graph/GraphTreemapPage'));
const GraphDegreeDistributionPage = lazy(() => import('../graph/GraphDegreeDistributionPage'));
const GraphRelationshipMatrixPage = lazy(() => import('../graph/GraphRelationshipMatrixPage'));
const GraphRadarPage = lazy(() => import('../graph/GraphRadarPage'));
const GraphDistributionPage = lazy(() => import('../graph/GraphDistributionPage'));

export default function VisualizeDataPage() {
  const { selectedFolderId: folderId, currentFolder } = useGlobalFolder();
  const { getPredictedLinks } = usePredictedLinks();
  
  const [nodeSearch, setNodeSearch] = useState('');
  const [minDegree, setMinDegree] = useState(0);
  const [showOrphans, setShowOrphans] = useState(true);
  
  const [selectedTypes, setSelectedTypes] = useState(new Set()); 
  const [selectedRelTypes, setSelectedRelTypes] = useState(new Set());
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [refreshToken, setRefreshToken] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const predictedLinks = useMemo(() => getPredictedLinks(folderId), [folderId, getPredictedLinks]);

  // --- AUTO-RESET ON FOLDER CHANGE ---
  useEffect(() => {
    let ignore = false;
    async function loadGraphContext() {
      if (!folderId) {
        setGraphData({ nodes: [], links: [] });
        setSelectedTypes(new Set());
        setSelectedRelTypes(new Set());
        return;
      }
      try {
        const data = await graphService.getFolder(folderId, 10000);
        if (!ignore && data) {
           setGraphData(data);
           // RESET FILTERS TO ALL FOR NEW FOLDER
           const nTypes = new Set(data.nodes.map(n => n.type || 'Unknown'));
           const rTypes = new Set(data.links.map(l => l.type || 'Unknown'));
           setSelectedTypes(nTypes);
           setSelectedRelTypes(rTypes);
           setNodeSearch('');
           setMinDegree(0);
        }
      } catch (error) { console.error(error); }
    }
    loadGraphContext();
    return () => { ignore = true; };
  }, [folderId]);

  // Refresh on CRUD
  useEffect(() => {
    const handleCrud = () => setRefreshToken((v) => v + 1);
    window.addEventListener('nnv2:graph-crud', handleCrud);
    return () => window.removeEventListener('nnv2:graph-crud', handleCrud);
  }, []);

  const allTypes = useMemo(() => [...new Set((graphData.nodes || []).map(n => n.type || 'Unknown'))].sort(), [graphData.nodes]);
  const allRelTypes = useMemo(() => [...new Set((graphData.links || []).map(l => l.type || 'Unknown'))].sort(), [graphData.links]);
  
  const nodeTypeColors = useMemo(() => {
    const map = {};
    allTypes.forEach((type) => { map[type] = getNodeTypeColor(type); });
    return map;
  }, [allTypes]);

  const relTypeColors = useMemo(() => {
    const map = {};
    allRelTypes.forEach((type) => { map[type] = getRelationshipTypeColor(type); });
    return map;
  }, [allRelTypes]);

  const sharedGraphProps = {
    folderId,
    graphData: mergePredictedLinks(graphData, predictedLinks),
    nodeTypeFilters: selectedTypes,
    relationshipTypeFilters: selectedRelTypes,
    nodeTypeColors,
    minDegree,
    showOrphans,
    nodeSearch,
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      {/* FLOATING SIDEBAR */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 z-40 w-72 flex-shrink-0 border-r border-border/50 bg-background/80 backdrop-blur-3xl flex flex-col p-8 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
         <button 
           onClick={() => setIsSidebarOpen(false)}
           className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
         >
           <PanelLeftClose size={16} />
         </button>

         <div className="relative mt-2 mb-12 text-muted-foreground focus-within:text-primary transition-colors">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" />
           <input 
             value={nodeSearch} onChange={(e) => setNodeSearch(e.target.value)}
             placeholder="Search entities..."
             className="w-full bg-muted/40 border border-border/50 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-1 ring-primary/30 transition-all placeholder:text-muted-foreground/50 text-foreground"
           />
         </div>
         
         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-2">
            {/* NODE FILTERS */}
            <div>
               <div className="flex items-center justify-between mb-4 px-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Entities</p>
                  <div className="flex gap-2">
                     <button onClick={() => setSelectedTypes(new Set(allTypes))} className="text-[10px] font-black uppercase text-primary/70 hover:text-primary transition-colors">All</button>
                     <button onClick={() => setSelectedTypes(new Set(['__none__']))} className="text-[10px] font-black uppercase text-primary/70 hover:text-primary transition-colors">None</button>
                  </div>
               </div>
               <div className="space-y-1">
                  {allTypes.map(type => (
                    <button key={type} onClick={() => {
                       const n = new Set(selectedTypes);
                       n.delete('__none__');
                       if (n.has(type)) n.delete(type); else n.add(type);
                       setSelectedTypes(n);
                    }} className={cn("w-full flex items-center gap-4 px-4 py-2 rounded-2xl transition-all", selectedTypes.has(type) ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted border border-transparent")}>
                       <div className="h-2 w-2 rounded-full" style={{ backgroundColor: nodeTypeColors[type] }} />
                       <span className="text-xs font-black uppercase tracking-widest truncate flex-1 text-left">{type}</span>
                       {selectedTypes.has(type) ? <CheckCircle2 size={14} /> : <Circle size={14} className="opacity-20" />}
                    </button>
                  ))}
               </div>
            </div>

            {/* CONNECTION FILTERS */}
            <div>
               <div className="flex items-center justify-between mb-4 px-1 mt-6">
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Connections</p>
                  <div className="flex gap-2">
                     <button onClick={() => setSelectedRelTypes(new Set(allRelTypes))} className="text-[10px] font-black uppercase text-primary/70 hover:text-primary transition-colors">All</button>
                     <button onClick={() => setSelectedRelTypes(new Set(['__none__']))} className="text-[10px] font-black uppercase text-primary/70 hover:text-primary transition-colors">None</button>
                  </div>
               </div>
               <div className="space-y-1">
                  {allRelTypes.map(type => (
                    <button key={type} onClick={() => {
                       const n = new Set(selectedRelTypes);
                       n.delete('__none__');
                       if (n.has(type)) n.delete(type); else n.add(type);
                       setSelectedRelTypes(n);
                    }} className={cn("w-full flex items-center gap-4 px-4 py-2 rounded-2xl transition-all", selectedRelTypes.has(type) ? "bg-muted/80 text-foreground border border-border/50" : "text-muted-foreground hover:bg-muted border border-transparent")}>
                       <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: relTypeColors[type] }} />
                       <span className="text-xs font-black uppercase tracking-widest truncate flex-1 text-left">{type}</span>
                       {selectedRelTypes.has(type) ? <CheckCircle2 size={14} /> : <Circle size={14} className="opacity-20" />}
                    </button>
                  ))}
               </div>
            </div>
         </div>

         <div className="mt-8 pt-8 border-t border-border/50">
            <div className="group relative flex justify-between items-center text-[11px] font-black uppercase tracking-widest mb-4 text-muted-foreground/80 hover:text-foreground transition-colors cursor-help">
               <div className="flex items-center gap-2">
                 <span>Connectivity</span>
                 <Info size={12} />
               </div>
               <span className="text-primary font-black">{minDegree}</span>
               <div className="absolute bottom-full left-0 mb-3 w-56 p-4 bg-popover border border-border rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all scale-95 group-hover:scale-100 z-50">
                  <p className="text-[10px] leading-relaxed normal-case font-medium text-popover-foreground">Filters entities based on relationship density.</p>
               </div>
            </div>
            <input type="range" min="0" max="10" value={minDegree} onChange={(e) => setMinDegree(parseInt(e.target.value))} className="w-full accent-primary" />
            <button onClick={() => { setNodeSearch(''); setMinDegree(0); setSelectedTypes(new Set(allTypes)); setSelectedRelTypes(new Set(allRelTypes)); }} className="w-full mt-10 py-3.5 rounded-xl bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2 border border-border/50">
               <RotateCcw size={14} /> Reset
            </button>
         </div>
      </div>

      {/* VIEWPORT */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isSidebarOpen ? "pl-72" : "pl-0"
      )}>
        <div className="px-12 py-8 border-b border-border/50 bg-card/40 flex items-center justify-between z-10 relative">
           <div className="flex items-center gap-8">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl bg-muted/50 text-muted-foreground transition-all border border-border/50",
                  !isSidebarOpen ? "hover:bg-primary/10 hover:text-primary hover:border-primary/30" : "opacity-0 pointer-events-none"
                )}
                title="Filters & Controls"
              >
                <SlidersHorizontal size={18} />
              </button>
              
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" />
                 <span className="text-xs font-black tracking-tighter text-muted-foreground">{currentFolder?.name || 'Archive'}</span>
              </div>
              <div className="h-8 w-[1px] bg-border/50 mx-2" />
              <GraphViewsNavigation sections={visualizeDataSections} basePath="/visualize" />
           </div>
        </div>

        <div className="flex-1 min-h-0 p-10 relative">
           <div className="h-full w-full rounded-[48px] border border-white/5 bg-card/10 backdrop-blur-3xl overflow-hidden shadow-2xl relative">
              <div className="h-full w-full overflow-y-auto custom-scrollbar p-12">
                 <Suspense fallback={<VisualizePageSkeleton />}>
                    <Routes>
                       <Route path="" element={<Navigate to="sunburst" replace />} />
                       <Route path="sunburst" element={<GraphSunburstPage {...sharedGraphProps} />} />
                       <Route path="treemap" element={<GraphTreemapPage {...sharedGraphProps} />} />
                       <Route path="radar" element={<GraphRadarPage {...sharedGraphProps} />} />
                       <Route path="distribution" element={<GraphDistributionPage {...sharedGraphProps} />} />
                       <Route path="degree" element={<GraphDegreeDistributionPage {...sharedGraphProps} />} />
                       <Route path="matrix" element={<GraphRelationshipMatrixPage {...sharedGraphProps} />} />
                       <Route path="*" element={<Navigate to="sunburst" replace />} />
                    </Routes>
                 </Suspense>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
