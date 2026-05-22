import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { HelpQuickStart } from './components/HelpQuickStart';
import { HelpWorkflows } from './components/HelpWorkflows';

export default function HelpPage() {
  return (
    <div className="space-y-8 pb-8">
      <section className="hero-surface-brand relative overflow-hidden rounded-[34px] border border-border/60 p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <LifeBuoy className="h-3.5 w-3.5" />
            Help
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            Platform guidance for upload, graph, chat, and analytics
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            This page focuses on what users actually need in Neural Nexus: how to move through folders, ingest data,
            explore graph views, run algorithms, and get better answers from the platform.
          </p>
        </div>
      </section>

      <HelpQuickStart />
      <HelpWorkflows />
    </div>
  );
}
