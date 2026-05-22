import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { analyticsService } from '../../../services/analyticsService';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';

function statusTone(status) {
  switch ((status || '').toLowerCase()) {
    case 'healthy':
      return 'text-emerald-600 dark:text-emerald-300';
    case 'critical':
      return 'text-red-600 dark:text-red-300';
    default:
      return 'text-primary dark:text-primary';
  }
}

function pickCount(value, fallbackKeys = []) {
  if (typeof value === 'number') return value;
  for (const key of fallbackKeys) {
    const candidate = value?.[key];
    if (typeof candidate === 'number') return candidate;
  }
  return 0;
}

export function GraphDataQualityPanel({ folderId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [incomplete, setIncomplete] = useState(null);
  const [missing, setMissing] = useState(null);

  const hasResults = Boolean(health || incomplete || missing);

  const summary = useMemo(() => ({
    incompleteCount: pickCount(incomplete, ['incomplete_count']),
    missingCount: pickCount(missing, ['found_count']),
    recommendations: Array.isArray(health?.recommendations) ? health.recommendations.slice(0, 3) : [],
  }), [health, incomplete, missing]);

  const runAnalysis = async () => {
    if (!folderId) return;
    setLoading(true);
    setError('');
    try {
      const [healthData, incompleteData, missingData] = await Promise.all([
        analyticsService.runAlgorithm('/analytics/graph-health', { folder_id: folderId }),
        analyticsService.runAlgorithm('/analytics/incomplete-entities', { folder_id: folderId }),
        analyticsService.runAlgorithm('/analytics/missing-relationships', { folder_id: folderId }),
      ]);
      setHealth(healthData || null);
      setIncomplete(incompleteData || null);
      setMissing(missingData || null);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Quality analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100/50 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Quality Metrics</span>
        </div>
        <Button 
          variant="outline" 
          size="xs" 
          className="h-7 gap-2 rounded-full border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:text-primary transition-all" 
          onClick={runAnalysis} 
          disabled={!folderId || loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {hasResults ? 'Rerun Audit' : 'Start Audit'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-[11px] font-medium text-red-600">
          {error}
        </div>
      )}

      {!hasResults && !loading && (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 mx-auto mb-3">
              <Sparkles className="h-5 w-5 text-primary opacity-40" />
           </div>
           <h3 className="text-[13px] font-bold text-slate-700">Ready for Analysis</h3>
           <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
             Audit graph health, check for incomplete entities, and discover missing relationships in this workspace.
           </p>
        </div>
      )}

      {hasResults && (
        <div className="grid gap-4">
          <Card className="overflow-hidden border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/50 rounded-[24px]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                   <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Integrity Score</span>
                </div>
                <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border-none bg-slate-50", statusTone(health?.status))}>
                   {health?.status || 'Calculated'}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {typeof health?.overall_score === 'number' ? Math.round(health.overall_score * 100) : '—'}
                </span>
                <span className="text-sm font-bold text-slate-400">% Healthy</span>
              </div>
              <div className="rounded-xl bg-slate-50/80 p-3 text-[11px] font-medium leading-relaxed text-slate-500 border border-slate-100">
                {health?.insight || 'No specific insights found for this dataset.'}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Incomplete
              </div>
              <div className="text-xl font-black text-slate-800">{summary.incompleteCount}</div>
              <p className="mt-1 text-[10px] font-medium leading-tight text-slate-400 truncate">{incomplete?.insight || 'Entity checks'}</p>
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Gaps
              </div>
              <div className="text-xl font-black text-slate-800">{summary.missingCount}</div>
              <p className="mt-1 text-[10px] font-medium leading-tight text-slate-400 truncate">{missing?.insight || 'Pattern checks'}</p>
            </div>
          </div>

          {summary.recommendations.length > 0 && (
            <div className="space-y-2.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Action Recommendations</Label>
              <div className="space-y-1.5">
                {summary.recommendations.map((recommendation) => (
                  <div key={recommendation} className="group flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white p-3 transition-all hover:border-primary/20 hover:shadow-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0 group-hover:bg-primary" />
                    <p className="text-[11px] font-medium leading-relaxed text-slate-600">
                      {recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>

  );
}
