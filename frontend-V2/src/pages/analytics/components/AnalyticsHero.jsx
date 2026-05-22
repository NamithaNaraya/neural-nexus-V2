import React from 'react';
import { Cpu, PlayCircle, Sparkles } from 'lucide-react';

export function AnalyticsHero() {
  return (
    <div className="hero-surface-brand relative overflow-hidden rounded-[32px] border border-border/60 p-6 sm:p-8">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-primary shadow-sm backdrop-blur">
            <Cpu className="h-4 w-4" />
            Algorithm Analysis Lab
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            Execute topological algorithms on deep graph data.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-lg">
            Standardize your folder scope or select a custom subset of nodes to reveal hidden structures via PageRank, Louvain, or Link Prediction.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-4 backdrop-blur-xl shadow-lg shadow-slate-900/5">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <PlayCircle className="h-4.5 w-4.5 text-primary" />
              Selective Scope
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground font-medium">Execute algorithms on isolated node subsets for precision insights.</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-4 backdrop-blur-xl shadow-lg shadow-slate-900/5">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              Structural Insight
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground font-medium">Ranked outputs and topological summaries instantly materialized.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
