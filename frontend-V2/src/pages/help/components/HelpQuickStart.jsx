import React from 'react';
import { BrainCircuit, FolderOpen, MessageSquareText, Network, Upload } from 'lucide-react';

const steps = [
  {
    icon: FolderOpen,
    title: 'Initialize Scope',
    description: 'Establish your workspace context. All browse, graph, and analytics operations stay synchronized.',
    accent: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: Upload,
    title: 'Ingest Data',
    description: 'Process raw intelligence source files into structured knowledge graph components.',
    accent: 'bg-secondary/20',
    iconColor: 'text-primary',
  },
  {
    icon: Network,
    title: 'Topographic Audit',
    description: 'Conduct deep spatial analysis using 2D, 3D, and hierarchical visualization protocols.',
    accent: 'bg-secondary/25',
    iconColor: 'text-primary',
  },
  {
    icon: BrainCircuit,
    title: 'Execute Logic',
    description: 'Apply topological algorithms and structural inference models to isolate patterns.',
    accent: 'bg-muted/80',
    iconColor: 'text-primary',
  },
  {
    icon: MessageSquareText,
    title: 'Contextual Query',
    description: 'Leverage graph-grounded LLM intelligence to extract insights from specific source data.',
    accent: 'bg-primary/8',
    iconColor: 'text-primary',
  },
];

export function HelpQuickStart() {
  return (
    <section className="space-y-6">
      <div className="px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary opacity-80">Onboarding Protocol</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">System Workflow</h2>
      </div>

      <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
        {steps.map(({ icon: Icon, title, description, accent, iconColor }) => (
          <div
            key={title}
            className="group relative flex flex-col rounded-[32px] border border-border/50 bg-card/70 p-6 shadow-xl shadow-[0_24px_54px_-38px_hsl(var(--primary)/0.18)] backdrop-blur-2xl transition-all duration-500 hover:border-primary/20 hover:shadow-[0_24px_54px_-36px_hsl(var(--primary)/0.2)]"
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-border/20 transition-transform duration-500 group-hover:scale-110 ${accent}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <h3 className="mt-5 text-base font-bold text-foreground tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground font-medium">{description}</p>
            
            <div className="absolute top-4 right-4 h-1.5 w-1.5 rounded-full bg-border/40 transition-colors group-hover:bg-primary/40" />
          </div>
        ))}
      </div>
    </section>
  );
}
