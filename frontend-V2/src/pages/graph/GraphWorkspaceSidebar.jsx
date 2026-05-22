import React, { useMemo, useState } from 'react';
import { ChevronLeft, GitBranch, MoveRight, Network, Radar, Sparkles, Target, Waypoints, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input, Label } from '../../components/ui/Input';
import { GraphColorFilterSection } from './components/GraphColorFilterSection';
import { GraphDataQualityPanel } from './components/GraphDataQualityPanel';
import { getNodeTypeColor, getRelationshipTypeColor } from './colorSystem';
import { cn } from '../../utils/cn';

function countActiveFilters({ nodeTypeFilters, relationshipTypeFilters, minDegree, showOrphans }) {
  let count = 0;
  count += nodeTypeFilters.size;
  count += relationshipTypeFilters.size;
  if (minDegree > 0) count += 1;
  if (!showOrphans) count += 1;
  return count;
}

function ToolChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/40 bg-background/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ToggleRow({ label, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-[20px] border px-4 py-3.5 text-left transition-all duration-300",
        active 
          ? "border-primary/20 bg-primary/[0.03] shadow-[0_2px_10px_rgba(var(--primary-rgb),0.05)]" 
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
      )}
    >
      <div className="min-w-0 pr-2">
        <div className={cn(
          "text-[13px] font-bold transition-colors",
          active ? "text-primary" : "text-slate-700"
        )}>
          {label}
        </div>
        <div className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">
          {description}
        </div>
      </div>
      <div
        className={cn(
          "relative flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-300",
          active ? "bg-primary" : "bg-slate-200"
        )}
      >
        <div className={cn(
          "absolute h-3.5 w-3.5 rounded-full bg-white transition-all duration-300 shadow-sm",
          active ? "left-[22px]" : "left-[4px]"
        )} />
      </div>
    </button>
  );
}

function OptionList({ items, onPick, emptyLabel }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
           <Network className="h-5 w-5 opacity-20" />
        </div>
        <p className="text-[11px] font-medium text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-2xl border border-slate-100 bg-white/50 p-2 shadow-sm backdrop-blur-sm">
      {items.map((node) => (
        <button
          key={node.id}
          type="button"
          onClick={() => onPick(node)}
          className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all hover:bg-primary/5"
        >
          <div className="min-w-0">
            <span className="block truncate text-[12px] font-bold text-slate-700 group-hover:text-primary transition-colors">
              {node.name || node.id}
            </span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-tight">{node.type || 'Entity'}</span>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <Target className="h-3.5 w-3.5" />
          </div>
        </button>
      ))}
    </div>
  );
}

function TraversalPanel({
  traversalModeActive,
  onTraversalToggle,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
           <Waypoints className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Path Traversal</span>
      </div>

      <ToggleRow
        label="Path traversal mode"
        description="Navigate step-by-step through linked nodes in the workspace."
        active={traversalModeActive}
        onClick={onTraversalToggle}
      />

      <div className="rounded-[20px] bg-indigo-50/50 p-4 border border-indigo-100/50">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-[11px] font-medium leading-relaxed text-indigo-600/80">
            Interactive controls will appear on the graph canvas once traversal is enabled.
          </p>
        </div>
      </div>
    </div>
  );
}

function HopFinderPanel({ allNodes, relationshipTypes, onOpenHopFinder }) {
  const [hopNodeQuery, setHopNodeQuery] = useState('');
  const [hopNode, setHopNode] = useState(null);
  const [hopDepth, setHopDepth] = useState(1);
  const [hopRelationshipTypes, setHopRelationshipTypes] = useState([]);

  const hopOptions = useMemo(() => {
    const query = hopNodeQuery.trim().toLowerCase();
    if (!query) return allNodes.slice(0, 8);
    return allNodes
      .filter((node) => `${node.name || ''} ${node.type || ''}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allNodes, hopNodeQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
           <Radar className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Discovery Engine</span>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Seed Entity</Label>
        <Input
          value={hopNode?.name || hopNodeQuery}
          className="h-11 rounded-[18px] border-slate-200 bg-white shadow-xs focus:ring-primary/10 transition-all"
          onChange={(event) => {
            setHopNode(null);
            setHopNodeQuery(event.target.value);
          }}
          onFocus={() => {
            if (hopNode?.name) setHopNodeQuery(hopNode.name);
          }}
          placeholder="Search for a node to expand from..."
        />
        <OptionList
          items={hopOptions}
          onPick={(node) => {
            setHopNode(node);
            setHopNodeQuery(node.name || node.id);
          }}
          emptyLabel="No entities found for this query."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Neighborhood Depth</Label>
          <div className="flex items-center gap-1.5 rounded-[16px] bg-slate-100 p-1">
            {[1, 2, 3].map((depth) => (
              <button
                key={depth}
                onClick={() => setHopDepth(depth)}
                className={cn(
                  "flex-1 h-8 rounded-[12px] text-[11px] font-bold transition-all",
                  hopDepth === depth 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {depth}H
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <Button
            variant="gradient"
            className="h-10 rounded-full bg-slate-900 text-white font-bold shadow-lg hover:shadow-slate-200 transition-all"
            disabled={!hopNode?.id}
            onClick={() => onOpenHopFinder(hopNode, hopDepth, hopRelationshipTypes)}
          >
            Expand View
          </Button>
        </div>
      </div>

      {relationshipTypes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Relationship Constraints</Label>
          <div className="flex flex-wrap gap-2">
            {relationshipTypes.slice(0, 12).map((type) => {
              const active = hopRelationshipTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => {
                    setHopRelationshipTypes((current) => (
                      current.includes(type)
                        ? current.filter((item) => item !== type)
                        : [...current, type]
                    ));
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
                    active 
                      ? "bg-primary text-white shadow-md" 
                      : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DistanceFinderPanel({ allNodes, pathLoading, pathError, pathSummary, onFindPath, onClearPath }) {
  const [pathSourceQuery, setPathSourceQuery] = useState('');
  const [pathTargetQuery, setPathTargetQuery] = useState('');
  const [pathSourceNode, setPathSourceNode] = useState(null);
  const [pathTargetNode, setPathTargetNode] = useState(null);

  const pathSourceOptions = useMemo(() => {
    const query = pathSourceQuery.trim().toLowerCase();
    if (!query) return allNodes.filter((node) => String(node.id) !== String(pathTargetNode?.id)).slice(0, 8);
    return allNodes
      .filter((node) => String(node.id) !== String(pathTargetNode?.id))
      .filter((node) => `${node.name || ''} ${node.type || ''}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allNodes, pathSourceQuery, pathTargetNode]);

  const pathTargetOptions = useMemo(() => {
    const query = pathTargetQuery.trim().toLowerCase();
    if (!query) return allNodes.filter((node) => String(node.id) !== String(pathSourceNode?.id)).slice(0, 8);
    return allNodes
      .filter((node) => String(node.id) !== String(pathSourceNode?.id))
      .filter((node) => `${node.name || ''} ${node.type || ''}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allNodes, pathTargetQuery, pathSourceNode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
           <MoveRight className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Route Intelligence</span>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Start Entity</Label>
          <Input
            value={pathSourceNode?.name || pathSourceQuery}
            className="h-10 rounded-xl border-slate-200"
            onChange={(event) => {
              setPathSourceNode(null);
              setPathSourceQuery(event.target.value);
            }}
            placeholder="Select origin..."
          />
          <OptionList
            items={pathSourceOptions}
            onPick={(node) => {
              setPathSourceNode(node);
              setPathSourceQuery(node.name || node.id);
            }}
            emptyLabel="No origin found."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">End Entity</Label>
          <Input
            value={pathTargetNode?.name || pathTargetQuery}
            className="h-10 rounded-xl border-slate-200"
            onChange={(event) => {
              setPathTargetNode(null);
              setPathTargetQuery(event.target.value);
            }}
            placeholder="Select destination..."
          />
          <OptionList
            items={pathTargetOptions}
            onPick={(node) => {
              setPathTargetNode(node);
              setPathTargetQuery(node.name || node.id);
            }}
            emptyLabel="No destination found."
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="gradient"
          className="flex-1 h-10 rounded-full bg-slate-900 text-white font-bold shadow-lg"
          disabled={!pathSourceNode?.id || !pathTargetNode?.id || pathLoading}
          onClick={() => onFindPath(pathSourceNode, pathTargetNode)}
        >
          {pathLoading ? <Sparkles className="h-4 w-4 animate-pulse mr-2" /> : <Waypoints className="h-4 w-4 mr-2" />}
          Calculate Shortest Path
        </Button>
        {pathSummary ? (
          <Button variant="ghost" className="h-10 w-10 rounded-full p-0 bg-slate-50" onClick={onClearPath}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {pathError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-[11px] font-medium text-red-600">
          {pathError}
        </div>
      )}

      {pathSummary && (
        <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
          <div className="text-[12px] font-bold text-slate-800">{pathSummary.sourceName} → {pathSummary.targetName}</div>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Optimal connection found in <span className="text-primary font-bold">{pathSummary.length} hops</span>.
          </p>
        </div>
      )}
    </div>
  );
}

function FiltersPanel({
  nodeTypes,
  nodeTypeFilters,
  setNodeTypeFilters,
  relationshipTypes,
  relationshipTypeFilters,
  setRelationshipTypeFilters,
  nodeTypeColors,
  setNodeTypeColors,
  relationshipTypeColors,
  setRelationshipTypeColors,
  minDegree,
  setMinDegree,
  showOrphans,
  setShowOrphans,
  onClearAllFilters,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
           <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Network className="h-4 w-4" />
           </div>
           <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Visibility Controllers</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-3 rounded-full text-[10px] font-bold text-slate-400 hover:text-primary transition-colors" onClick={onClearAllFilters}>
          Reset Defaults
        </Button>
      </div>

      <div className="grid gap-3">
        <ToggleRow
          label="Cleanup Workspace"
          description="Hide nodes that aren't connected to anything else."
          active={!showOrphans}
          onClick={() => setShowOrphans((value) => !value)}
        />
        <ToggleRow
          label="Denser Subgraphs"
          description="Focus on highly connected clusters in the active view."
          active={minDegree >= 2}
          onClick={() => setMinDegree((value) => (value >= 2 ? 0 : 2))}
        />
      </div>

      <div className="space-y-4 rounded-[24px] bg-slate-50/50 p-5 border border-slate-100">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Connectivity Threshold</Label>
          <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-900 shadow-sm">
            {minDegree === 0 ? 'Unlimited' : `${minDegree}+ Neighbors`}
          </span>
        </div>
        <div className="px-2">
          <input
            type="range"
            min={0}
            max={10}
            value={minDegree}
            onChange={(event) => setMinDegree(Number(event.target.value))}
            className="h-1.5 w-full appearance-none rounded-full bg-slate-200 accent-primary cursor-pointer transition-all hover:bg-slate-300"
          />
          <div className="flex justify-between mt-2.5 px-0.5">
             <span className="text-[10px] font-bold text-slate-300">Broad</span>
             <span className="text-[10px] font-bold text-slate-300">Dense</span>
          </div>
        </div>
      </div>

      <GraphColorFilterSection
        title="Knowledge Categories"
        icon={Network}
        items={nodeTypes}
        activeItems={nodeTypeFilters}
        setActiveItems={setNodeTypeFilters}
        colorMap={nodeTypeColors}
        setColorMap={setNodeTypeColors}
        getColor={getNodeTypeColor}
      />

      <GraphColorFilterSection
        title="Relation Patterns"
        icon={GitBranch}
        items={relationshipTypes}
        activeItems={relationshipTypeFilters}
        setActiveItems={setRelationshipTypeFilters}
        colorMap={relationshipTypeColors}
        setColorMap={setRelationshipTypeColors}
        getColor={getRelationshipTypeColor}
      />
    </div>
  );
}

export function GraphWorkspaceSidebar({
  open = false,
  onClose,
  folderId,
  minDegree,
  setMinDegree,
  showOrphans,
  setShowOrphans,
  nodeTypes,
  nodeTypeFilters,
  setNodeTypeFilters,
  relationshipTypes,
  relationshipTypeFilters,
  setRelationshipTypeFilters,
  nodeTypeColors,
  setNodeTypeColors,
  relationshipTypeColors,
  setRelationshipTypeColors,
  allNodes = [],
  onClearAllFilters,
  onFindPath,
  onOpenHopFinder,
  pathLoading = false,
  pathError = '',
  pathSummary = null,
  onClearPath,
  traversalModeActive = false,
  traversalPathNodes = [],
  onTraversalToggle,
  onTraversalBack,
  onTraversalReset,
  activePanel = 'filters',
  panelTitle = 'Graph tools',
  panelDescription = '',
}) {
  const activeFilterCount = countActiveFilters({
    nodeTypeFilters,
    relationshipTypeFilters,
    minDegree,
    showOrphans,
  });

  if (!open) return null;

  return (
    <Card className="absolute left-2 top-full z-30 mt-3 flex w-[min(380px,calc(100vw-2.5rem))] max-h-[min(calc(100vh-12.5rem),650px)] flex-col overflow-hidden rounded-[26px] border border-border/40 bg-card/92 shadow-[0_20px_55px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">{panelTitle}</div>
            <p className="max-w-[240px] text-[11px] font-medium leading-relaxed text-muted-foreground">
              {panelDescription || (activeFilterCount > 0 ? `${activeFilterCount} active controls currently applied.` : 'Use these controls to shape and inspect the graph workspace.')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="h-8 w-8 rounded-full border border-border/50 bg-background shadow-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-2 pb-2 animate-in fade-in-0 duration-200 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/45 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border/70">
          {activePanel === 'filters' ? (
            <FiltersPanel
              nodeTypes={nodeTypes}
              nodeTypeFilters={nodeTypeFilters}
              setNodeTypeFilters={setNodeTypeFilters}
              relationshipTypes={relationshipTypes}
              relationshipTypeFilters={relationshipTypeFilters}
              setRelationshipTypeFilters={setRelationshipTypeFilters}
              nodeTypeColors={nodeTypeColors}
              setNodeTypeColors={setNodeTypeColors}
              relationshipTypeColors={relationshipTypeColors}
              setRelationshipTypeColors={setRelationshipTypeColors}
              minDegree={minDegree}
              setMinDegree={setMinDegree}
              showOrphans={showOrphans}
              setShowOrphans={setShowOrphans}
              onClearAllFilters={onClearAllFilters}
            />
          ) : null}

          {activePanel === 'traversal' ? (
            <TraversalPanel
              traversalModeActive={traversalModeActive}
              onTraversalToggle={onTraversalToggle}
            />
          ) : null}

          {activePanel === 'hop' ? (
            <HopFinderPanel
              allNodes={allNodes}
              relationshipTypes={relationshipTypes}
              onOpenHopFinder={onOpenHopFinder}
            />
          ) : null}

          {activePanel === 'distance' ? (
            <DistanceFinderPanel
              allNodes={allNodes}
              pathLoading={pathLoading}
              pathError={pathError}
              pathSummary={pathSummary}
              onFindPath={onFindPath}
              onClearPath={onClearPath}
            />
          ) : null}

          {activePanel === 'quality' ? (
            <GraphDataQualityPanel folderId={folderId} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
