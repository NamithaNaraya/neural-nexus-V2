import React from 'react';
import { BarChart3, Compass, FolderGit2, MessageSquare, UploadCloud } from 'lucide-react';

const workflows = [
  {
    icon: UploadCloud,
    title: 'Ingest workflow',
    points: ['Select a folder in the header', 'Upload one or more files', 'Wait for extraction and graph building'],
  },
  {
    icon: Compass,
    title: 'Browse and graph workflow',
    points: ['Switch views without losing filters', 'Search nodes or narrow by type', 'Inspect structures in 2D, 3D, schema, and tables'],
  },
  {
    icon: BarChart3,
    title: 'Analytics workflow',
    points: ['Choose full folder or selected nodes', 'Pick an algorithm and optional weighting', 'Read results in the right-side panel'],
  },
  {
    icon: MessageSquare,
    title: 'Chat workflow',
    points: ['Keep the active folder selected', 'Ask questions grounded in graph data', 'Use answers and sources to continue exploration'],
  },
];

const tips = [
  'If results look too broad, switch the folder in the header first.',
  'Use Graph filters before analytics when you want a smaller working set.',
  'Browse is best for inspection, Graph is best for structure, Analytics is best for ranking and clustering.',
  'Create multiple folders when you want to compare datasets cleanly.',
];

export function HelpWorkflows() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[30px] border border-border/60 bg-card/82 p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <FolderGit2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Platform Guides</p>
            <h2 className="text-2xl font-semibold">Common workflows</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {workflows.map(({ icon: Icon, title, points }) => (
            <div key={title} className="rounded-3xl border border-border/50 bg-background/72 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/70">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
              </div>
              <div className="mt-4 space-y-2">
                {points.map((point) => (
                  <p key={point} className="text-sm text-muted-foreground">
                    {point}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[30px] border border-border/60 bg-card/82 p-6 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.3)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Best Practices</p>
        <h2 className="mt-2 text-2xl font-semibold">Tips for better results</h2>
        <div className="mt-6 space-y-4">
          {tips.map((tip) => (
            <div key={tip} className="rounded-2xl border border-border/50 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground">
              {tip}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
