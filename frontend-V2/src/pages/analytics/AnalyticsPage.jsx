import React, { useEffect, useState } from 'react';
import { AlgorithmSidebar } from './components/algorithm/AlgorithmSidebar';
import { AlgorithmSetupCard } from './components/algorithm/AlgorithmSetupCard';
import { DataScopeCard } from './components/data/DataScopeCard';
import { AnalyticsResultsPanel } from './components/AnalyticsResultsPanel';
import { describeWeightFormula, formatAlgorithmSummary } from './helpers';
import { useAnalyticsWorkbench } from './useAnalyticsWorkbench';
import { BrainCircuit, Activity } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

export default function AnalyticsPage() {
  const [topPanelsCollapsed, setTopPanelsCollapsed] = useState(false);
  const {
    folderId,
    currentFolder,
    folderNodes,
    folderLinks,
    nodeTypes,
    relationshipTypes,
    graphStats,
    selectedNodes,
    toggleNode,
    clearSelection,
    selectedAlgorithm,
    selectedAlgorithmId,
    setSelectedAlgorithmId,
    algorithmParams,
    setAlgorithmParam,
    running,
    result,
    error,
    runAlgorithm,
    relationshipProperties,
    weightingEnabled,
    setWeightingEnabled,
    weightFormulaType,
    setWeightFormulaType,
    weightProperty,
    setWeightProperty,
    weightNumerator,
    setWeightNumerator,
    weightDenominator,
    setWeightDenominator,
    weightPrimaryProperty,
    setWeightPrimaryProperty,
    weightSecondaryProperty,
    setWeightSecondaryProperty,
    weightPrimaryCoefficient,
    setWeightPrimaryCoefficient,
    weightSecondaryCoefficient,
    setWeightSecondaryCoefficient,
    weightFormula,
    runFullFolder,
    setRunFullFolder,
  } = useAnalyticsWorkbench();

  useEffect(() => {
    if (result) {
      setTopPanelsCollapsed(true);
    }
  }, [result]);

  return (
    <section aria-labelledby="analytics-page-title" className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      {/* Analytics Header — fixed height, never scrolls */}
      <div className="flex flex-col gap-4 px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3">
           <div className="p-2.5 rounded-2xl bg-accent/10 backdrop-blur-xl border border-accent/20">
             <BrainCircuit className="h-6 w-6 text-accent animate-pulse" />
           </div>
           <Badge variant="secondary" className="px-5 py-2 text-[10px] bg-accent/5 text-accent border border-accent/20 uppercase tracking-[0.3em] font-black rounded-xl">
             Analytics Tools
           </Badge>
        </div>
        <div className="space-y-2">
          <h1 id="analytics-page-title" className="text-4xl font-black tracking-tighter text-foreground uppercase">Analysis Workbench</h1>
          <p className="max-w-3xl text-[14px] text-muted-foreground/60 font-bold leading-relaxed tracking-tight group-hover:text-muted-foreground/80 transition-colors">
            Run algorithms on your data to discover patterns, relationships, and insights. Configure parameters and view results in real-time.
          </p>
        </div>
      </div>

      {/* Main Content — 2-column grid, fills ALL remaining height, NO scroll on the grid itself */}
      <div className="flex-1 min-h-0 grid xl:grid-cols-[340px_minmax(0,1fr)] gap-6 px-6 pb-6 overflow-hidden">
        {/* LEFT: Algorithm Sidebar — scrolls independently */}
        <div className="min-h-0 overflow-y-auto animate-in fade-in slide-in-from-left-8 duration-700 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border/60">
          <AlgorithmSidebar
            selectedAlgorithmId={selectedAlgorithmId}
            setSelectedAlgorithmId={setSelectedAlgorithmId}
          />
        </div>

        {/* RIGHT: Workbench — flex column, NO overflow-y-auto so flex-1 on children works */}
        <div className="flex flex-col h-full min-h-0 gap-6 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Top Setup Cards — shrink-0, never takes more space than needed */}
          <div className={cn(
            "grid gap-6 shrink-0 transition-all duration-700",
            topPanelsCollapsed ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 xl:grid-cols-[1fr_1.1fr]"
          )}>
            <AlgorithmSetupCard
              collapsed={topPanelsCollapsed}
              selectedAlgorithm={selectedAlgorithm}
              folderNodes={folderNodes}
              graphStats={graphStats}
              algorithmParams={algorithmParams}
              setAlgorithmParam={setAlgorithmParam}
              runFullFolder={runFullFolder}
              selectedNodes={selectedNodes}
              running={running}
              runAlgorithm={runAlgorithm}
              relationshipProperties={relationshipProperties}
              weightingEnabled={weightingEnabled}
              setWeightingEnabled={setWeightingEnabled}
              weightFormulaType={weightFormulaType}
              setWeightFormulaType={setWeightFormulaType}
              weightProperty={weightProperty}
              setWeightProperty={setWeightProperty}
              weightNumerator={weightNumerator}
              setWeightNumerator={setWeightNumerator}
              weightDenominator={weightDenominator}
              setWeightDenominator={setWeightDenominator}
              weightPrimaryProperty={weightPrimaryProperty}
              setWeightPrimaryProperty={setWeightPrimaryProperty}
              weightSecondaryProperty={weightSecondaryProperty}
              setWeightSecondaryProperty={setWeightSecondaryProperty}
              weightPrimaryCoefficient={weightPrimaryCoefficient}
              setWeightPrimaryCoefficient={setWeightPrimaryCoefficient}
              weightSecondaryCoefficient={weightSecondaryCoefficient}
              setWeightSecondaryCoefficient={setWeightSecondaryCoefficient}
            />

            <DataScopeCard
              collapsed={topPanelsCollapsed}
              onToggleCollapsed={() => setTopPanelsCollapsed((current) => !current)}
              currentFolder={currentFolder}
              graphStats={graphStats}
              nodeTypes={nodeTypes}
              relationshipTypes={relationshipTypes}
              folderNodes={folderNodes}
              folderLinks={folderLinks}
              runFullFolder={runFullFolder}
              setRunFullFolder={setRunFullFolder}
              selectedNodes={selectedNodes}
              toggleNode={toggleNode}
              clearSelection={clearSelection}
            />
          </div>

          {/* Results Panel — MUST fill all remaining height. flex-1 + min-h-0 ensures this.
              The AnalyticsResultsPanel itself uses flex-1 to fill this container,
              and its inner table body has overflow-y-auto for scrolling. */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden" aria-live="polite">
            <AnalyticsResultsPanel
              result={result}
              error={error}
              summary={`${formatAlgorithmSummary(
                result,
                selectedAlgorithm,
                runFullFolder ? 0 : selectedNodes.length,
                currentFolder?.name
              )} ${weightingEnabled && weightFormula ? describeWeightFormula(weightFormula) : ''}`.trim()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
