import React from 'react';
import { Button } from '../../../components/ui/Button';
import { BrainCircuit, Info, ListOrdered, Network, Radar, X } from 'lucide-react';
import { getAlgorithmDetails, getResultMetrics, getResultSubtitle, getResultTitle } from '../chatAlgorithmDetails';

export function ChatAnswerDetailsDrawer({ isOpen, message, onClose }) {
  if (!isOpen || !message) return null;

  const algorithmDetails = getAlgorithmDetails(message.algorithm);
  const results = Array.isArray(message.results) ? message.results.filter(Boolean) : [];
  const openInGraph = (nodeId) => {
    if (!nodeId) return;
    try {
      window.location.href = `/graph/2d?exploreId=${encodeURIComponent(String(nodeId))}`;
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div
        className="absolute inset-0 z-20 bg-stone-950/10 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Answer details"
        className="absolute right-6 top-3 bottom-5 z-30 w-[min(100vw-3rem,24rem)] overflow-hidden rounded-[30px] border border-border/50 bg-card/96 shadow-[0_30px_90px_-45px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <BrainCircuit className="h-4 w-4" />
                View Details
              </div>
              <h3 className="mt-2 text-lg font-semibold text-foreground">{algorithmDetails.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{algorithmDetails.category}</p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={onClose}
              aria-label="Close answer details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <section className="rounded-2xl border border-border/40 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Info className="h-4 w-4" />
                What This Method Does
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground/90">{algorithmDetails.summary}</p>
            </section>

            <section className="rounded-2xl border border-border/40 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Network className="h-4 w-4" />
                How To Read The Score
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground/90">{algorithmDetails.scoreMeaning}</p>
            </section>

            <section className="rounded-2xl border border-border/40 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <ListOrdered className="h-4 w-4" />
                Ranked Results
              </div>

              {results.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {results.slice(0, 10).map((result, index) => {
                    const metrics = getResultMetrics(result, message.algorithm);
                    const title = getResultTitle(result, index);
                    const subtitle = getResultSubtitle(result);
                    const nodeId = result?.node_id || result?.id || result?.nodeId || null;

                    return (
                      <div
                        key={`${title}-${index}`}
                        className="rounded-2xl border border-border/30 bg-card/80 p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-foreground">{title}</div>
                            {subtitle ? (
                              <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                {subtitle}
                              </div>
                            ) : null}

                            {metrics.length > 0 ? (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {metrics.map((metric) => (
                                  <div key={metric.label} className="rounded-xl border border-border/30 bg-background/70 px-3 py-2">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                      {metric.label}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">{metric.value}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {nodeId ? (
                              <div className="mt-4 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => openInGraph(nodeId)}
                                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary transition hover:bg-primary/12"
                                  title="Open this node in Graph"
                                >
                                  <Radar className="h-3.5 w-3.5" />
                                  Open in graph
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  This answer used graph analysis, but the backend did not return ranked rows for display.
                </p>
              )}
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}
