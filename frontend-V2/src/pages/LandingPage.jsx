import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  Database,
  GitBranch,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const neuralNodes = [
  { id: 1, x: '10%', y: '22%', size: 18 },
  { id: 2, x: '22%', y: '48%', size: 12 },
  { id: 3, x: '36%', y: '18%', size: 14 },
  { id: 4, x: '50%', y: '54%', size: 20 },
  { id: 5, x: '64%', y: '28%', size: 12 },
  { id: 6, x: '76%', y: '60%', size: 16 },
  { id: 7, x: '88%', y: '24%', size: 10 },
];

const neuralLinks = [
  ['10%', '22%', '22%', '48%'],
  ['22%', '48%', '36%', '18%'],
  ['36%', '18%', '50%', '54%'],
  ['50%', '54%', '64%', '28%'],
  ['64%', '28%', '76%', '60%'],
  ['64%', '28%', '88%', '24%'],
  ['22%', '48%', '50%', '54%'],
];

const highlights = [
  {
    icon: BrainCircuit,
    title: 'Graph-native AI',
    description: 'Ask grounded questions across files, entities, and relationships without losing structure.',
  },
  {
    icon: GitBranch,
    title: 'Connected knowledge',
    description: 'Turn uploads, tables, and direct logic into one searchable graph workspace.',
  },
  {
    icon: Radar,
    title: 'Visual intelligence',
    description: 'Move from folders to graph, browse, chat, and analytics in one smooth flow.',
  },
];

const quickStats = [
  { label: 'Knowledge graph', value: 'Unified' },
  { label: 'Workspace flow', value: 'Folders to insights' },
  { label: 'Experience', value: 'Pastel, calm, fast' },
];

const featureCards = [
  {
    icon: Database,
    title: 'Ingest',
    text: 'Upload files, map tables, paste text, or run direct queries into the same workspace.',
  },
  {
    icon: MessageSquareText,
    title: 'Chat',
    text: 'Get clean answers with graph context, saved history, and web support when needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Operate',
    text: 'Keep teams aligned with one theme system, one workspace model, and one shared design language.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[-6%] h-[28rem] w-[28rem] rounded-full bg-primary/16 blur-3xl" />
          <div className="absolute right-[-6%] top-[8%] h-[24rem] w-[24rem] rounded-full bg-accent/16 blur-3xl" />
          <div className="absolute bottom-[-8%] left-[24%] h-[22rem] w-[22rem] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <section className="mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-6 pb-10 pt-6 lg:px-10">
          <header className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-[20px] bg-primary shadow-2xl shadow-primary/40 ring-4 ring-primary/20">
                <BrainCircuit className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-black tracking-tight leading-none text-foreground">Neural Nexus</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">Next-Gen Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button as={Link} to="/login" variant="outline" className="rounded-2xl px-6 h-11 font-bold border-border/60">
                Sign in
              </Button>
              <Button as={Link} to="/login" variant="default" className="rounded-2xl px-6 h-11 font-black shadow-lg shadow-primary/25">
                GET STARTED
              </Button>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-16 py-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-primary shadow-sm backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
                V2.0 NEURAL INDIGO CORE
              </div>

              <div className="space-y-6">
                <h1 className="max-w-3xl text-6xl font-black leading-[0.98] tracking-[-0.05em] text-foreground xl:text-7xl">
                  Connect your <span className="text-primary">knowledge</span> dots with ease.
                </h1>
                <p className="max-w-2xl text-xl font-medium leading-relaxed text-muted-foreground/80">
                   The ultimate neural workspace for data-driven teams. Transform fragmented documents and knowledge graphs into an interactive, high-performance platform.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button as={Link} to="/login" variant="default" className="h-14 rounded-2xl px-8 text-base font-black tracking-tight shadow-xl shadow-primary/30 active:scale-95 group">
                  LAUNCH WORKSPACE
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button as={Link} to="/login" variant="outline" className="h-14 rounded-2xl px-8 text-base font-black border-border/60 hover:bg-secondary transition-all">
                  LEARN MORE
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {quickStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[32px] border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur-xl group hover:border-primary/30 transition-all duration-500"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 transition-colors group-hover:text-primary">{item.label}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-[3rem] border border-border/50 bg-secondary/30 p-8 shadow-2xl ring-1 ring-white/10">
                <div className="absolute inset-0 opacity-40">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    {neuralLinks.map(([x1, y1, x2, y2], index) => (
                      <line
                        key={index}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="hsl(var(--primary))"
                        strokeWidth="0.5"
                      />
                    ))}
                  </svg>
                </div>

                <div className="absolute inset-0">
                  {neuralNodes.map((node, index) => (
                    <div
                      key={node.id}
                      className="absolute rounded-full border-2 border-white/80 bg-white shadow-lg animate-float"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: `${node.size * 3.5}px`,
                        height: `${node.size * 3.5}px`,
                        transform: 'translate(-50%, -50%)',
                        animationDelay: `${index * 0.4}s`,
                      }}
                    >
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 flex min-h-[30rem] flex-col justify-between">
                  <div className="ml-auto max-w-[20rem] rounded-[32px] border border-border/50 bg-white/40 p-6 shadow-xl backdrop-blur-3xl ring-1 ring-white/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">CORE ENGINE</p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight leading-tight text-foreground">Graph, chat, and insight in one flow.</h2>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground/80 font-medium">
                      Neural Nexus provides a seamless interface between unstructured data and structured relational intelligence.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {highlights.map((item) => (
                      <div key={item.title} className="rounded-[24px] border border-border/60 bg-white/70 p-5 backdrop-blur-xl shadow-sm">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                          <item.icon className="h-5.5 w-5.5" />
                        </div>
                        <h3 className="mt-4 text-[15px] font-black tracking-tight text-foreground">{item.title}</h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/70 font-medium">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-6 pb-12 md:grid-cols-3">
            {featureCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[36px] border border-border/60 bg-card/60 p-8 shadow-xl backdrop-blur-xl group hover:border-primary/40 transition-all duration-500"
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-secondary text-primary transition-transform group-hover:scale-110 shadow-sm border border-border/20">
                  <item.icon className="h-6.5 w-6.5" />
                </div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-medium">{item.text}</p>
              </div>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
