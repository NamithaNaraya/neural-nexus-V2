import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Label } from '../ui/Input';
import { 
  FileSpreadsheet, 
  Upload, 
  ChevronRight, 
  ChevronLeft, 
  Database, 
  Plus, 
  Trash2, 
  Network, 
  Settings2,
  Table as TableIcon,
  CheckCircle2,
  Brain,
  ArrowRight,
  ArrowLeftRight,
  Info,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { uploadService } from '../../services/uploadService';

export function ExcelMapper({ folderId, onSuccess }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  
  // Mapping State (Tabular)
  const [columnMappings, setColumnMappings] = useState([]);
  const [relationships, setRelationships] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const xlsxRef = useRef(null);

  // --- Step 1: File Loading ---
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setXlsxLoading(true);
        const XLSX = await import('xlsx');
        xlsxRef.current = XLSX;
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        processSheet(wb, wb.SheetNames[0], XLSX);
      } finally {
        setXlsxLoading(false);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const processSheet = (wb, sheetName, XLSXArg) => {
    const XLSX = XLSXArg || xlsxRef.current;
    if (!XLSX) return;
    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws);
    if (jsonData.length > 0) {
      const cols = Object.keys(jsonData[0]);
      setHeaders(cols);
      setData(jsonData);
      
      // Pre-fill Logic: Try to guess Node vs Property
      const initialMappings = cols.map(col => {
        const isLikelyNode = col.toLowerCase().includes('id') || col.toLowerCase().includes('name') || col.toLowerCase().includes('code');
        return {
          column: col,
          role: isLikelyNode ? 'node' : 'property',
          target: isLikelyNode ? col.replace(/_id|_name|_code/gi, '').toUpperCase() : '',
          active: true
        };
      });
      setColumnMappings(initialMappings);
      setStep(2);
    }
  };

  const nextStep = () => {
    if (step === 3 && relationships.length === 0) {
      const activeNodes = columnMappings.filter(m => m.role === 'node' && m.active && m.target);
      if (activeNodes.length >= 2) {
        const autoRels = [];
        for (let i = 0; i < activeNodes.length - 1; i++) {
          autoRels.push({
            id: `auto-${i}-${Date.now()}`,
            source: activeNodes[i].target,
            target: activeNodes[i+1].target,
            label: 'RELATED_TO',
            bidirectional: false
          });
        }
        setRelationships(autoRels);
      }
    }
    setStep(prev => prev + 1);
  };
  
  const prevStep = () => setStep(prev => prev - 1);

  // --- Step 3 & 4 Handlers ---
  const updateColumnMapping = (index, updates) => {
    setColumnMappings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const addRelationship = () => {
    const nodes = columnMappings.filter(m => m.role === 'node' && m.active);
    if (nodes.length < 2) return;
    setRelationships([...relationships, {
      id: Date.now().toString(),
      source: nodes[0].target,
      target: nodes[1].target,
      label: 'CONNECTED_TO',
      bidirectional: false
    }]);
  };

  const updateRelationship = (id, updates) => {
    setRelationships(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRelationship = (id) => {
    setRelationships(prev => prev.filter(r => r.id !== id));
  };

  // --- Step 5: Cypher Generation ---
  const generatedCypher = useMemo(() => {
    if (data.length === 0) return '';
    
    let cypher = '// Generated Knowledge Ingestion\n';
    cypher += `// Tabular Logic Mapping: ${file?.name}\n\n`;
    
    const limit = 5000; 
    const processData = data.slice(0, limit);
    
    const activeNodes = columnMappings.filter(m => m.active && m.role === 'node' && m.target);
    const activeProps = columnMappings.filter(m => m.active && m.role === 'property' && m.target);

    const sessionUsedAliases = new Set();
    const getUniqueAlias = (pfx) => {
      let id = `${pfx}_${Math.random().toString(36).substring(2, 6)}`;
      while (sessionUsedAliases.has(id)) {
        id = `${pfx}_${Math.random().toString(36).substring(2, 6)}`;
      }
      sessionUsedAliases.add(id);
      return id;
    };
    
    processData.forEach((row, index) => {
      // Per-row aliases to ensure we link correctly
      const rowNodeMap = new Map(); // target -> alias
      
      // 1. Merge Nodes (Unique IDs)
      activeNodes.forEach((node) => {
        const idVal = row[node.column];
        if (idVal === undefined || idVal === null) return;
        
        const escapedIdVal = typeof idVal === 'string' ? `'${idVal.replace(/'/g, "\\'")}'` : idVal;
        const safeCol = node.column.replace(/[^a-zA-Z0-9]/g, '_');
        const nodeAlias = getUniqueAlias(`v${index}`);
        
        // Cache the first alias found for this target in this row for relationships
        if (!rowNodeMap.has(node.target)) {
          rowNodeMap.set(node.target, nodeAlias);
        }
        
        cypher += `MERGE (${nodeAlias}: \`${node.target}\` { \`${safeCol}\`: ${escapedIdVal} })\n`;
        cypher += `SET ${nodeAlias}.source_file = '${file?.name}', ${nodeAlias}.folder_id = '${folderId}'\n`;
        
        // Add properties belonging to this node
        const myProps = activeProps.filter(p => p.target === node.target);
        if (myProps.length > 0) {
          const propStrings = myProps.map(p => {
            const val = row[p.column];
            if (val === undefined || val === null) return null;
            const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "\\'")}'` : val;
            return `\`${p.column.replace(/[^a-zA-Z0-9]/g, '_')}\`: ${escapedVal}`;
          }).filter(Boolean);
          
          if (propStrings.length > 0) {
            cypher += `SET ${nodeAlias} += { ${propStrings.join(', ')} }\n`;
          }
        }
      });
      
      // 2. Merge Relationships
      relationships.forEach((rel) => {
        const sourceAlias = rowNodeMap.get(rel.source);
        const targetAlias = rowNodeMap.get(rel.target);
        
        if (!sourceAlias || !targetAlias) return;
        
        cypher += `MERGE (${sourceAlias})-[:\`${rel.label}\`]->(${targetAlias})\n`;
        if (rel.bidirectional) {
          cypher += `MERGE (${targetAlias})-[:\`${rel.label}\`]->(${sourceAlias})\n`;
        }
      });
      
      cypher += '\n';
    });
    
    return cypher;
  }, [data, columnMappings, relationships, file, folderId]);

  const commitData = async () => {
    if (!generatedCypher.trim() || !folderId) return;
    setCommitting(true);
    setResult(null);
    try {
      const data = await uploadService.ingestCypher(folderId, generatedCypher, `Excel Ingest: ${file?.name}`);
      setResult({ success: true, message: 'Mapping logic applied and data committed to the graph.' });
      if (onSuccess) onSuccess(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let message = 'Ingestion failed';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        // Show the field location if available to help debugging
        message = detail.map(d => {
          const loc = d.loc ? `[${d.loc.join(' > ')}] ` : '';
          return `${loc}${d.msg || JSON.stringify(d)}`;
        }).join(', ');
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail);
      }
      setResult({ success: false, message });
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-8 overflow-hidden animate-in fade-in duration-700">
      {/* Premium Stepper UI */}
      <div className="w-full px-4 md:px-8">
        <div className="relative flex items-center justify-between">
          {/* Background Track */}
          <div className="absolute top-[20px] left-0 w-full h-[3px] bg-border/10 rounded-full z-0" />
          
          {/* Active Progress Fill */}
          <div 
            className="absolute top-[20px] left-0 h-[3px] bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out z-0 rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.24)]" 
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />

          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className="relative z-10 flex flex-col items-center group"
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500",
                  step > s 
                    ? "bg-primary text-white shadow-[0_0_20px_hsl(var(--primary)/0.28)] scale-110" 
                    : step === s 
                    ? "bg-background border-[3px] border-primary text-primary shadow-[0_0_25px_hsl(var(--primary)/0.16)] scale-125" 
                    : "bg-background border-2 border-border/40 text-muted-foreground/40 group-hover:border-primary/30 group-hover:text-primary/40"
                )}
              >
                {step > s ? (
                  <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" />
                ) : (
                  <span className={cn(step === s ? "animate-pulse" : "")}>{s}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className={cn(
                  "text-[9px] uppercase font-black tracking-[0.2em] transition-all duration-300 whitespace-nowrap",
                  step >= s ? "text-primary" : "text-muted-foreground/40"
                )}>
                  {s === 1 ? 'Import' : s === 2 ? 'Inspect' : s === 3 ? 'Mapping' : s === 4 ? 'Linking' : 'Commit'}
                </span>
                {step === s && (
                  <div className="mt-1.5 h-1 w-1 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.9)] animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 pt-6">
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6 flex flex-col items-center justify-center py-12 animate-in slide-in-from-bottom-8">
            <div className="w-24 h-24 rounded-3xl bg-accent/14 flex items-center justify-center text-accent">
              <Upload className="w-10 h-10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black tracking-tight">Supply Knowledge Base</h3>
              <p className="text-sm text-muted-foreground max-w-sm font-medium">Upload your Excel or CSV structured data to begin logical graph mapping.</p>
            </div>
            <Button 
              variant="outline" 
              className="h-14 rounded-2xl px-10 gap-3 border-primary/25 text-foreground font-black relative overflow-hidden group disabled:opacity-60 disabled:cursor-wait"
              onClick={() => document.getElementById('excel-input').click()}
              disabled={xlsxLoading}
            >
              <div className="absolute inset-0 bg-primary/8 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              {xlsxLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
              {xlsxLoading ? 'Loading parser…' : 'Choose Structured File'}
              <input 
                id="excel-input" 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload} 
              />
            </Button>
          </div>
        )}

        {/* Step 2: Inspection */}
        {step === 2 && (
          <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden animate-in slide-in-from-right-8">
            <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <h3 className="text-lg font-black uppercase tracking-widest text-emerald-500">Structure Found</h3>
                <p className="text-xs text-muted-foreground font-medium">Verify detected columns and choose the active workspace sheet.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Label className="text-[10px] font-black uppercase opacity-60">Sheet:</Label>
                <select 
                  className="max-w-full bg-background border border-border/40 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500/20"
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                    processSheet(workbook, e.target.value);
                  }}
                >
                  {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="w-full max-w-full overflow-hidden rounded-[2rem] border border-border/10 bg-card/30 backdrop-blur-2xl shadow-2xl">
              <div className="max-h-[500px] overflow-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-background/80 backdrop-blur-md">
                    {headers.map(h => (
                      <th key={h} className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80 border-b border-emerald-500/10 whitespace-nowrap min-w-[180px] bg-secondary/10">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-secondary/20 transition-colors">
                      {headers.map(h => (row[h] !== undefined && (
                        <td key={h} className="px-4 py-3.5 text-xs font-medium text-foreground/80 whitespace-nowrap">
                          <div className="max-w-[220px] truncate">{String(row[h])}</div>
                        </td>
                      )))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {data.length > 5 && (
                <div className="p-4 text-center bg-secondary/10">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Showing first 5 of {data.length} records</p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" className="rounded-2xl gap-2 font-bold" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4" /> Go Back
              </Button>
              <Button variant="gradient" className="rounded-2xl gap-2 px-8 font-black" onClick={nextStep}>
                Configure Mapping <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Mapping Table */}
        {step === 3 && (
          <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden animate-in slide-in-from-right-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-widest text-emerald-500">Knowledge Logic Table</h3>
                <p className="text-xs text-muted-foreground font-medium">Define the role of each column and assign its graph target.</p>
              </div>
            </div>

            <div className="w-full max-w-full overflow-hidden rounded-[2rem] border border-border/10 bg-card/30 backdrop-blur-2xl shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/10 border-b border-border/20">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Column</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Graph Role</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Mapped Target</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {columnMappings.map((mapping, idx) => (
                    <tr key={idx} className={cn("border-b border-border/10 transition-colors", !mapping.active && "opacity-40 grayscale")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", mapping.role === 'node' ? "bg-primary" : "bg-cyan-500")} />
                          <span className="text-sm font-bold truncate max-w-[200px]">{mapping.column}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <select 
                          className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                          value={mapping.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            const updates = { role: newRole };
                            if (newRole === 'node') {
                              updates.target = mapping.column.toUpperCase();
                            } else if (newRole === 'property') {
                              updates.target = '';
                            }
                            updateColumnMapping(idx, updates);
                          }}
                        >
                          <option value="node">Create Node</option>
                          <option value="property">Add Property</option>
                          <option value="ignore">Ignore Column</option>
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        {mapping.role === 'node' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-500/50 uppercase">TYPE:</span>
                            <Input 
                              value={mapping.target}
                              onChange={(e) => updateColumnMapping(idx, { target: e.target.value.toUpperCase() })}
                              placeholder="e.g. PHYSICIAN"
                              className="h-9 rounded-xl text-xs font-black bg-secondary/30 border-border/50 text-foreground"
                            />
                          </div>
                        ) : mapping.role === 'property' ? (
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase text-cyan-500/60">TO:</span>
                             <select 
                               className="bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none text-foreground"
                               value={mapping.target}
                               onChange={(e) => updateColumnMapping(idx, { target: e.target.value })}
                             >
                               <option value="">Choose Node...</option>
                               {columnMappings.filter(m => m.role === 'node' && m.active).map(m => (
                                 <option key={m.target} value={m.target}>{m.target}</option>
                               ))}
                             </select>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic font-medium">Bypassing this data column</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                         <button 
                           onClick={() => updateColumnMapping(idx, { active: !mapping.active })}
                           className={cn("p-2 rounded-xl transition-all", mapping.active ? "text-muted-foreground hover:text-red-500 hover:bg-red-500/10" : "text-emerald-500 hover:bg-emerald-500/10")}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" className="rounded-2xl gap-2 font-bold" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4" /> Go Back
              </Button>
              <Button 
                variant="gradient" 
                className="rounded-2xl gap-2 px-8 font-black" 
                onClick={nextStep}
                disabled={columnMappings.filter(m => m.role === 'node' && m.active).length === 0}
              >
                Define Logic Links <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Relationship Matrix */}
        {step === 4 && (
          <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden animate-in slide-in-from-right-8">
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase tracking-widest text-emerald-500">Logical Connections</h3>
              <p className="text-xs text-muted-foreground font-medium">Link your mapped nodes to define semantic relationships.</p>
            </div>

            <div className="space-y-4">
              {relationships.map((rel) => (
                <Card key={rel.id} className="relative min-w-0 rounded-3xl border-amber-500/20 bg-amber-500/5 transition-all hover:bg-amber-500/10">
                  <button 
                    onClick={() => removeRelationship(rel.id)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <CardContent className="min-w-0 p-6">
                    <div className="flex min-w-0 flex-col items-center gap-6 lg:flex-row">
                      <div className="w-full lg:w-1/3 space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-60 px-1 text-amber-600/70">From Node</Label>
                        <select 
                          className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:ring-1 focus:ring-amber-500 text-foreground"
                          value={rel.source}
                          onChange={(e) => updateRelationship(rel.id, { source: e.target.value })}
                        >
                          {columnMappings.filter(m => m.role === 'node' && m.active).map(n => (
                            <option key={n.target} value={n.target}>{n.target}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col items-center justify-center px-4 w-full lg:w-[240px] relative">
                         <div className="w-full h-0.5 bg-amber-500/30 absolute top-1/2 -translate-y-1/2 hidden lg:block" />
                         <div className="space-y-3 relative z-10 w-full text-center">
                            <div className="flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => {
                                   const r = rel;
                                   updateRelationship(rel.id, { source: r.target, target: r.source });
                                 }}
                                 className="p-2 rounded-xl bg-background border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 transition-all"
                                 title="Swap Direction"
                               >
                                 <RotateCcw className="w-3.5 h-3.5" />
                               </button>
                               <button 
                                 onClick={() => updateRelationship(rel.id, { bidirectional: !rel.bidirectional })}
                                 className={cn(
                                   "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                                   rel.bidirectional ? "bg-amber-500 border-amber-500 text-white" : "bg-background border-amber-500/30 text-amber-500"
                                 )}
                                 title={rel.bidirectional ? "Bi-directional" : "Single direction"}
                               >
                                 {rel.bidirectional ? <ArrowLeftRight className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                               </button>
                            </div>
                            <Input 
                              placeholder="e.g. WORKS_AT" 
                              className="bg-background border-amber-500/50 uppercase font-black text-[11px] text-center h-10 rounded-full tracking-widest text-amber-500"
                              value={rel.label}
                              onChange={(e) => updateRelationship(rel.id, { label: e.target.value.toUpperCase() })}
                            />
                         </div>
                      </div>

                      <div className="w-full lg:w-1/3 space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-60 px-1 text-cyan-600/70">To Node</Label>
                        <select 
                          className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 text-xs font-black uppercase outline-none focus:ring-1 focus:ring-cyan-500 text-foreground"
                          value={rel.target}
                          onChange={(e) => updateRelationship(rel.id, { target: e.target.value })}
                        >
                          {columnMappings.filter(m => m.role === 'node' && m.active).map(n => (
                            <option key={n.target} value={n.target}>{n.target}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button 
                variant="outline" 
                className="w-full py-10 border-2 border-dashed border-border/20 rounded-3xl text-sm font-black uppercase tracking-widest hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-500 transition-all gap-2"
                onClick={addRelationship}
                disabled={columnMappings.filter(m => m.role === 'node' && m.active).length < 2}
              >
                <Plus className="w-5 h-5" /> Link Mapped Nodes
              </Button>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" className="rounded-2xl gap-2 font-bold" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4" /> Go Back
              </Button>
              <Button variant="gradient" className="rounded-2xl gap-2 px-8 font-black" onClick={nextStep}>
                Preview Transaction <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Commit */}
        {step === 5 && (
          <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-widest text-emerald-500">Final Verification</h3>
                  <p className="text-xs text-muted-foreground font-medium">Review logical transformations for {data.length} records.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-6 rounded-3xl bg-secondary/20 border border-border/40 overflow-hidden relative group">
                    <div className="absolute top-4 right-4 text-[9px] font-black uppercase text-emerald-500/30 flex items-center gap-2">
                       <Network className="w-3 h-3" /> Visual Graph Schema
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">Knowledge Map Preview</h4>
                    
                    <div className="space-y-6">
                      {/* Nodes Grid */}
                      <div className="flex flex-wrap gap-3">
                        {columnMappings.filter(m => m.active && m.role === 'node').map(n => (
                          <div key={n.column} className="px-4 py-2.5 rounded-2xl bg-background border border-emerald-500/30 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-left-2 duration-500">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 glow-sm" />
                             <span className="text-xs font-black uppercase tracking-tight text-foreground">{n.target}</span>
                          </div>
                        ))}
                      </div>

                      {/* Relationships List (Visual) */}
                      <div className="space-y-2 pt-2 border-t border-border/10">
                        {relationships.map((r, idx) => (
                          <div 
                            key={r.id} 
                            className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
                            style={{ animationDelay: `${idx * 100}ms` }}
                          >
                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 truncate max-w-[80px]">{r.source}</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent relative flex items-center justify-center">
                               <div className="absolute inset-y-0 h-4 px-3 flex items-center justify-center bg-secondary/80 rounded-full border border-amber-500/20 shadow-sm">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-600">{r.label}</span>
                                  {r.bidirectional && <div className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                               </div>
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                                  <ArrowRight className="w-2.5 h-2.5 text-amber-500" />
                               </div>
                               {r.bidirectional && (
                                 <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                                    <ChevronLeft className="w-2.5 h-2.5 text-amber-500" />
                                 </div>
                               )}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 truncate max-w-[80px]">{r.target}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <Info className="w-5 h-5 text-emerald-500 shrink-0" />
                    <p className="text-[11px] leading-relaxed font-medium text-foreground/80">
                      Ingestion will execute <span className="text-emerald-500 font-black">{data.length} logical blocks</span>. All operations use <span className="font-bold">MERGE</span> for safe updates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Logic Preview</Label>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Cypher Engine v4</span>
                </div>
                <div className="h-[300px] w-full max-w-full overflow-auto rounded-3xl border border-border/20 bg-secondary/30 p-5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 custom-scrollbar">
                  <pre className="whitespace-pre-wrap">{generatedCypher}</pre>
                </div>
              </div>
            </div>

            {result && (
              <div className={`p-5 rounded-3xl border flex items-center gap-4 animate-in slide-in-from-top-4 ${result.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-current opacity-20">
                  {result.success ? <CheckCircle2 className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                </div>
                <p className="text-sm font-black tracking-tight">{result.message}</p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-border/10">
              <Button variant="ghost" className="rounded-2xl gap-2 font-bold" onClick={prevStep} disabled={committing}>
                <ChevronLeft className="w-4 h-4" /> Go Back
              </Button>
              <Button 
                variant="gradient" 
                className="h-14 rounded-2xl gap-3 px-10 font-black shadow-2xl shadow-emerald-500/30" 
                onClick={commitData}
                disabled={committing || result?.success}
              >
                {committing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Network className="w-5 h-5" />}
                <span>{committing ? 'Streaming to Graph...' : 'Initiate Graph Ingestion'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
