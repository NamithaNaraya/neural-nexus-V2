import React from 'react';
import { Calculator, Play, Activity, Settings2, Target, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Input, Label } from '../../../../components/ui/Input';
import { cn } from '../../../../utils/cn';

function NodeSelectField({ label, value, nodes, onChange }) {
  return (
    <div className="space-y-3">
      <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 ml-1">{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[20px] border border-border/15 bg-secondary/10 px-5 text-[14px] font-bold text-foreground focus:ring-4 focus:ring-primary/10 hover:border-primary/30 transition-all duration-300 appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2rem' }}
      >
        <option value="">Select a Node</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id} className="bg-card text-foreground">
            {node.name || node.id} {node.type ? `[${node.type}]` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AlgorithmSetupCard({
  collapsed,
  selectedAlgorithm,
  folderNodes,
  graphStats,
  algorithmParams,
  setAlgorithmParam,
  runFullFolder,
  selectedNodes,
  running,
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
}) {
  const Icon = selectedAlgorithm?.icon;

  if (collapsed) {
    return (
      <Card className="border-border/20 bg-secondary/15 shadow-sm backdrop-blur-[40px] rounded-[24px] ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white/80 shadow-sm border-border/10', selectedAlgorithm?.chipClass)}>
                <Icon className={cn('h-5 w-5', selectedAlgorithm?.iconClass || 'text-muted-foreground/60')} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Algorithm</span>
                <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]', selectedAlgorithm?.chipClass || 'border-border/10 bg-secondary/5 text-muted-foreground/50')}>
                  {selectedAlgorithm?.group || 'Network'}
                </span>
              </div>
              <h3 className="text-sm font-black tracking-tight text-foreground uppercase truncate mt-0.5">
                {selectedAlgorithm?.name || 'Select Algorithm'} • <span className="text-[11px] text-muted-foreground/50 font-bold lowercase tracking-normal">
                  {runFullFolder
                    ? `${graphStats.nodes.toLocaleString()} nodes`
                    : `${selectedNodes.length} selected`}
                </span>
              </h3>
            </div>
          </div>
          <Button 
            onClick={runAlgorithm} 
            disabled={running || !selectedAlgorithm}
            variant="gradient"
            className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 shadow-lg hover:scale-105 active:scale-[0.96] transition-all duration-300"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />}
            {running ? 'Running' : 'Run'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/20 bg-secondary/15 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-[40px] rounded-[32px] ring-1 ring-white/10 overflow-hidden">
      <CardContent className="space-y-6 p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {Icon && (
              <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border transition-all duration-500 bg-white/80 shadow-sm border-border/10', selectedAlgorithm?.chipClass || 'group-hover:rotate-3')}>
                <Icon className={cn('h-6.5 w-6.5', selectedAlgorithm?.iconClass || 'text-muted-foreground/60')} />
              </div>
            )}
            <div className="min-w-0 pt-1">
               <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Algorithm Settings</span>
               </div>
              <h2 className="text-xl font-black tracking-tighter text-foreground uppercase">{selectedAlgorithm?.name || 'Select an Algorithm'}</h2>
              <p className="mt-1 line-clamp-1 text-[12px] font-bold text-muted-foreground/50 tracking-tight">{selectedAlgorithm?.description || 'Choose an algorithm to begin analysis'}</p>
            </div>
          </div>
          <span className={cn('shrink-0 rounded-[14px] border px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] shadow-sm', selectedAlgorithm?.chipClass || 'border-border/10 bg-secondary/5 text-muted-foreground/50')}>
            {selectedAlgorithm?.group || 'Network'}
          </span>
        </div>

          <div className="space-y-8 animate-fade-in">
            {/* Execution Control */}
            <div className={cn(
              'rounded-[28px] border border-border/10 p-6 shadow-inner transition-all duration-700',
              selectedAlgorithm?.accent ? `bg-gradient-to-br ${selectedAlgorithm.accent}` : 'bg-secondary/5'
            )}>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-white uppercase tracking-tight">Analysis Scope</h3>
                    <p className="text-[11px] font-bold text-white/70 tracking-tight">
                      {runFullFolder
                        ? `${graphStats.nodes.toLocaleString()} Total Nodes`
                        : `${selectedNodes.length} Selected Nodes`}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={runAlgorithm} 
                  disabled={running || !selectedAlgorithm}
                  className="h-14 px-10 rounded-[20px] bg-white text-primary font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all text-[12px]"
                >
                  {running ? <Loader2 className="w-5.5 h-5.5 animate-spin mr-3" /> : <Play className="w-5.5 h-5.5 mr-3 fill-current" />}
                  {running ? 'Processing...' : 'Run Analysis'}
                </Button>
              </div>
            </div>

            {/* Dynamics / Parameters */}
            {(selectedAlgorithm?.params || []).filter((param) => param.type !== 'hidden').length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 bg-secondary/5 p-6 rounded-[28px] border border-border/10">
                {selectedAlgorithm.params.filter((param) => param.type !== 'hidden').map((param) => {
                  if (param.type === 'node-select') {
                    return (
                      <NodeSelectField
                        key={param.key}
                        label={param.label}
                        value={algorithmParams[param.key] || ''}
                        nodes={folderNodes}
                        onChange={(value) => setAlgorithmParam(param.key, value)}
                      />
                    );
                  }

                  return (
                    <div key={param.key} className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 ml-1">{param.label}</Label>
                      <Input
                        type="number"
                        min={param.min}
                        max={param.max}
                        value={algorithmParams[param.key] ?? ''}
                        onChange={(event) => setAlgorithmParam(param.key, Number(event.target.value) || param.defaultValue || 0)}
                        className="h-12 rounded-[20px] border-border/15 bg-secondary/10 px-5 font-bold focus:ring-4 focus:ring-primary/10 transition-all duration-300"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Weighting & Formulas */}
            <div className="space-y-5 rounded-[32px] border border-border/10 bg-secondary/5 p-8 shadow-inner">
              <div className="flex items-start justify-between gap-4 border-b border-border/10 pb-6 mb-6">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                     <Calculator className="h-6 w-6 text-primary" />
                   </div>
                   <div>
                    <h3 className="text-[15px] font-black text-foreground uppercase tracking-tight">Quantitative Weighting</h3>
                    <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">Calibration Layers</p>
                   </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWeightingEnabled((current) => !current)}
                  disabled={!selectedAlgorithm?.usesWeights || relationshipProperties.length === 0}
                  className={cn(
                    'group relative h-8 w-14 rounded-full transition-all duration-500 ring-4 ring-transparent',
                    weightingEnabled ? 'bg-primary ring-primary/10 shadow-lg shadow-primary/25' : 'bg-muted-foreground/20',
                    (!selectedAlgorithm?.usesWeights || relationshipProperties.length === 0) && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-500',
                    weightingEnabled ? 'left-[26px] scale-90' : 'left-1 scale-75 opacity-80'
                  )} />
                </button>
              </div>

              {selectedAlgorithm?.usesWeights ? (
                relationshipProperties.length > 0 ? (
                  <div className="space-y-8 animate-in fade-in duration-700">
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                      {['property', 'ratio', 'weighted_sum'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setWeightFormulaType(type)}
                          className={cn(
                            'rounded-[18px] border py-3 px-4 text-[11px] font-black uppercase tracking-widest transition-all duration-500',
                            weightFormulaType === type 
                              ? 'border-primary/40 bg-white text-primary shadow-xl shadow-primary/5 ring-1 ring-primary/10 translate-y-[-2px]' 
                              : 'border-border/10 bg-secondary/10 text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white'
                          )}
                        >
                          {type === 'property' ? 'Single Core' : type === 'ratio' ? 'Dynamic Ratio' : 'Hybrid Sum'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-6 pt-2">
                    {weightFormulaType === 'property' && (
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 ml-1">Relationship Property</Label>
                        <select value={weightProperty} onChange={(event) => setWeightProperty(event.target.value)} className="h-12 w-full rounded-[20px] border border-border/15 bg-secondary/20 px-5 text-[14px] font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all duration-300 appearance-none">
                          {relationshipProperties.map((property) => (
                            <option key={property} value={property}>{property}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {weightFormulaType === 'ratio' && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 ml-1">Numerator</Label>
                          <select value={weightNumerator} onChange={(event) => setWeightNumerator(event.target.value)} className="h-12 w-full rounded-[20px] border border-border/15 bg-secondary/20 px-5 text-[14px] font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all duration-300 appearance-none">
                            {relationshipProperties.map((property) => (
                              <option key={property} value={property}>{property}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 ml-1">Denominator Base</Label>
                          <select value={weightDenominator} onChange={(event) => setWeightDenominator(event.target.value)} className="h-12 w-full rounded-[20px] border border-border/15 bg-secondary/20 px-5 text-[14px] font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all duration-300 appearance-none">
                            {relationshipProperties.map((property) => (
                              <option key={property} value={property}>{property}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {weightFormulaType === 'weighted_sum' && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 ml-1">Primary Dimension</Label>
                          <div className="flex gap-3">
                            <Input type="number" step="0.1" value={weightPrimaryCoefficient} onChange={(event) => setWeightPrimaryCoefficient(Number(event.target.value) || 0)} className="w-[80px] h-12 rounded-[20px] border-border/15 bg-secondary/20 font-bold px-4" />
                            <select value={weightPrimaryProperty} onChange={(event) => setWeightPrimaryProperty(event.target.value)} className="flex-1 h-12 rounded-[20px] border border-border/15 bg-secondary/20 px-5 text-[14px] font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all duration-300 appearance-none">
                              {relationshipProperties.map((property) => (
                                <option key={property} value={property}>{property}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 ml-1">Secondary Dimension</Label>
                          <div className="flex gap-3">
                            <Input type="number" step="0.1" value={weightSecondaryCoefficient} onChange={(event) => setWeightSecondaryCoefficient(Number(event.target.value) || 0)} className="w-[80px] h-12 rounded-[20px] border-border/15 bg-secondary/20 font-bold px-4" />
                            <select value={weightSecondaryProperty} onChange={(event) => setWeightSecondaryProperty(event.target.value)} className="flex-1 h-12 rounded-[20px] border border-border/15 bg-secondary/20 px-5 text-[14px] font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all duration-300 appearance-none">
                              {relationshipProperties.map((property) => (
                                <option key={property} value={property}>{property}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest text-center py-4 bg-secondary/5 rounded-2xl border border-border/10">No numeric field properties discovered in this cluster.</p>
                )
              ) : (
                <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest text-center py-4 bg-secondary/5 rounded-2xl border border-border/10">Engine restricted to structural dynamics (Formula N/A).</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
