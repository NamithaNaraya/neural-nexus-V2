import React, { useState } from 'react';
import { cn } from '../../../utils/cn';
import { BrainCircuit, ChevronDown, ChevronUp, Info, Activity } from 'lucide-react';
import { getAlgorithmDetails } from '../chatAlgorithmDetails';

export const AlgorithmInsight = ({ algorithm, results, dataGrounding }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const details = getAlgorithmDetails(algorithm);
  
  if (!algorithm) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-[28px] border border-primary/25 bg-primary/5 shadow-sm backdrop-blur-xl transition-all duration-500 hover:border-primary/40 hover:bg-primary/8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Algorithm Insight</span>
            <span className="text-sm font-bold text-foreground">{details.label}</span>
          </div>
        </div>
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-500",
          isExpanded ? "rotate-180" : ""
        )}>
          <ChevronDown className="h-4 w-4" />
        </div>
      </button>

      <div className={cn(
        "grid transition-all duration-500 ease-in-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="border-t border-primary/10 px-6 py-5">
            <div className="mb-4 flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
              <div className="space-y-1.5">
                <p className="text-[13px] font-bold text-foreground/90">What does this do?</p>
                <p className="text-[13px] leading-relaxed text-foreground/70">
                  {details.description || details.summary}
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-start gap-3">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
              <div className="space-y-1.5">
                <p className="text-[13px] font-bold text-foreground/90">Insight Score</p>
                <p className="text-[13px] leading-relaxed text-foreground/70">
                  {details.scoreMeaning}
                </p>
              </div>
            </div>

            {dataGrounding?.source_count > 0 && (
              <div className="mt-6 flex items-center gap-6 border-t border-primary/10 pt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary/50">Data Nodes</span>
                  <span className="text-sm font-bold text-foreground">{dataGrounding.source_count}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary/50">Analysis Scope</span>
                  <span className="text-sm font-bold text-foreground">
                    {Math.round((dataGrounding.context_chars || 0) / 100) / 10}k chars
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary/50">Category</span>
                  <span className="text-sm font-bold text-foreground">{details.category}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
