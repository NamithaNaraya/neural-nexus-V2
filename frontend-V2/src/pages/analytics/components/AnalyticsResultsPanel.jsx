import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Sparkles, Filter, Database, Search, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { getCompactTypeLabel, getDisplayName, getScoreLabel, getTypeToneClasses } from '../helpers';
import { cn } from '../../../utils/cn';

function getNumericScore(item) {
  if (typeof item?.score === 'number') return item.score;
  if (typeof item?.similarity === 'number') return item.similarity;
  if (typeof item?.auth_score === 'number') return item.auth_score;
  if (typeof item?.hub_score === 'number') return item.hub_score;
  if (typeof item?.community === 'number') return item.community;
  if (typeof item?.community_id === 'number') return item.community_id;
  return 0;
}

export function AnalyticsResultsPanel({ result, summary, error }) {
  const [visibleCount, setVisibleCount] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState('score-desc');
  const scrollContainerRef = useRef(null);

  const rows = useMemo(() => result?.results || [], [result]);

  useEffect(() => {
    setVisibleCount(25);
    setSearchTerm('');
    setSelectedType('ALL');
    setSortBy('score-desc');
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [result]);

  const uniqueTypes = useMemo(() => {
    const types = rows.map((item) => getCompactTypeLabel(item));
    return [...new Set(types)].sort();
  }, [rows]);

  const filteredAndSortedRows = useMemo(() => {
    let resultRows = [...rows];

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      resultRows = resultRows.filter((item) => {
        const name = getDisplayName(item).toLowerCase();
        const target = (item.target_name || '').toLowerCase();
        const source = (item.source_name || '').toLowerCase();
        return name.includes(searchLower) || target.includes(searchLower) || source.includes(searchLower);
      });
    }

    // Type filter
    if (selectedType !== 'ALL') {
      resultRows = resultRows.filter((item) => getCompactTypeLabel(item) === selectedType);
    }

    // Sorting
    resultRows.sort((a, b) => {
      if (sortBy === 'name-asc') {
        const nameA = getDisplayName(a).toLowerCase();
        const nameB = getDisplayName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      
      const scoreA = getNumericScore(a);
      const scoreB = getNumericScore(b);
      
      if (sortBy === 'score-desc') {
        return scoreB - scoreA;
      } else {
        return scoreA - scoreB;
      }
    });

    return resultRows;
  }, [rows, searchTerm, selectedType, sortBy]);

  const visibleRows = filteredAndSortedRows.slice(0, visibleCount);

  function handleScroll(event) {
    const element = event.currentTarget;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 120;

    if (nearBottom && visibleCount < filteredAndSortedRows.length) {
      setVisibleCount((count) => Math.min(count + 25, filteredAndSortedRows.length));
    }
  }

  return (
    <Card className="flex flex-1 min-h-0 flex-col border-border/20 bg-secondary/15 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-[40px] rounded-[32px] ring-1 ring-white/10 overflow-hidden">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 p-8 overflow-hidden">
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Analysis Results</div>
            <h2 className="text-xl font-black tracking-tighter text-foreground uppercase">Result Distribution</h2>
          </div>
          {result && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 shadow-sm">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {filteredAndSortedRows.length === rows.length
                    ? `${rows.length} Items`
                    : `${filteredAndSortedRows.length} / ${rows.length} Filtered`}
                </span>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="flex-shrink-0 rounded-2xl border border-destructive/25 bg-destructive/10 px-6 py-4 text-[13px] font-bold text-destructive animate-fade-in">
            {error}
          </div>
        )}

        {!result && !error && (
          <div className="flex flex-1 items-center justify-center rounded-[32px] border-2 border-dashed border-border/20 bg-secondary/5 px-8 py-20 text-center animate-fade-in overflow-y-auto">
            <div className="space-y-6 max-w-sm">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Sparkles className="h-10 w-10 text-primary/30" />
                </div>
                <div className="space-y-2">
                    <p className="text-lg font-black uppercase tracking-tight text-foreground/80">Ready to Analyze</p>
                    <p className="text-[13px] font-bold text-muted-foreground/40 leading-relaxed">Select a folder and algorithm, then run the analysis.</p>
                </div>
            </div>
          </div>
        )}

        {result && (
          <div className="flex min-h-0 flex-1 flex-col gap-6 animate-in fade-in duration-700 overflow-hidden">
            {/* Analysis Metadata & Summary */}
            <div className="flex-shrink-0 rounded-[28px] border border-primary/20 bg-primary/10 p-6 shadow-inner ring-1 ring-primary/5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white border border-primary/20 text-primary shadow-xl shadow-primary/10">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="pt-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Analysis Complete</p>
                  <p className="mt-2 text-[14px] font-bold leading-relaxed text-foreground/90 tracking-tight">{summary}</p>
                </div>
              </div>
            </div>

            {/* Premium Filter Control Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-secondary/10 border border-border/10 rounded-3xl p-4 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search target nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl border border-border/15 bg-background/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="pl-9 pr-8 py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl border border-border/15 bg-background/40 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none min-w-[130px]"
                  >
                    <option value="ALL">All Types</option>
                    {uniqueTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="pl-9 pr-8 py-2.5 text-xs font-black uppercase tracking-wider rounded-2xl border border-border/15 bg-background/40 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none min-w-[170px]"
                  >
                    <option value="score-desc">Score: High to Low</option>
                    <option value="score-asc">Score: Low to High</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex min-h-0 flex-1 flex-col rounded-[32px] border border-border/15 bg-white/40 shadow-xl overflow-hidden backdrop-blur-3xl ring-1 ring-white/10">
              <div className="grid grid-cols-12 gap-4 border-b border-border/10 px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 bg-secondary/5 flex-shrink-0">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Node / Target</div>
                <div className="col-span-3">Data Type</div>
                <div className="col-span-3 text-right">Intensity</div>
              </div>

              <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border/60" onScroll={handleScroll}>
                {visibleRows.length > 0 ? (
                  visibleRows.map((item, index) => (
                    <div 
                      key={item.id || `${index}-${getDisplayName(item)}`} 
                      className="grid grid-cols-12 gap-4 border-t border-border/5 px-8 py-4.5 text-sm hover:bg-primary/5 transition-all duration-300 group animate-in fade-in duration-300"
                    >
                      <div className="col-span-1 text-[11px] font-black text-muted-foreground/30 group-hover:text-primary/50 transition-colors pt-1.5">
                          {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="col-span-5 min-w-0">
                        <div className="truncate font-black text-foreground tracking-tight text-[13px] uppercase pt-1">
                          {item.target_name ? `${getDisplayName(item)} ➔ ${item.target_name}` : getDisplayName(item)}
                        </div>
                      </div>
                      <div className="col-span-3 pt-0.5">
                        <span
                          className={cn(
                              'inline-flex max-w-full truncate rounded-[10px] border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm',
                              getTypeToneClasses(item)
                          )}
                          title={getCompactTypeLabel(item)}
                        >
                          {getCompactTypeLabel(item)}
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-mono text-[14px] font-black text-primary tracking-tighter pt-1 pr-1">
                        {getScoreLabel(item)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p className="text-sm font-bold">No results match your filter criteria</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
