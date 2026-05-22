import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Label } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Database, Loader2, Play, Sparkles, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { uploadService } from '../../services/uploadService';
import { cn } from '../../utils/cn';

export function CypherIngest({ folderId, onSuccess }) {
  const [filename, setFilename] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const handlePreview = async () => {
    if (!query.trim() || !folderId) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const data = await uploadService.previewCypher(folderId, query);
      setPreview(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let message = 'Preview failed';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map(d => {
          const loc = d.loc ? `[${d.loc.join(' > ')}] ` : '';
          return `${loc}${d.msg || JSON.stringify(d)}`;
        }).join(', ');
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail);
      }
      setPreview({ error: true, message });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!query.trim() || !folderId) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadService.ingestCypher(folderId, query, filename);
      setResult({ success: true, message: 'Cypher transformation executed and synced to knowledge graph.' });
      setQuery('');
      setFilename('');
      setPreview(null);
      if (onSuccess) onSuccess(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let message = 'Direct ingestion failed';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map(d => {
          const loc = d.loc ? `[${d.loc.join(' > ')}] ` : '';
          return `${loc}${d.msg || JSON.stringify(d)}`;
        }).join(', ');
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail);
      }
      setResult({ success: false, message });
    } finally {
      setLoading(false);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Side */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-accent/80">Transaction Reference</Label>
            <Input
              placeholder="e.g., Manual BioActive Property Update"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="h-12 rounded-2xl border-border/40 bg-background/50 focus:ring-accent/30"
            />
          </div>

          <div className="space-y-2 relative group">
            <Label className="text-[10px] font-black uppercase tracking-widest text-accent/80">Cypher Logic</Label>
            <textarea
              placeholder="CREATE (n:Entity {id: randomUUID(), name: '...'})"
              className="flex min-h-[350px] w-full rounded-3xl border border-border/40 bg-card px-5 py-4 font-mono text-xs leading-relaxed text-stone-800 transition-all focus:outline-none focus:ring-2 focus:ring-accent/20 dark:bg-card dark:text-stone-100 custom-scrollbar selection:bg-accent/20"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button 
                onClick={clearQuery}
                className="absolute right-4 bottom-4 p-2 rounded-xl bg-whiteAlpha.50 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl gap-2 border-accent/40 font-bold text-accent-foreground hover:bg-accent/10"
              disabled={previewLoading || !query.trim() || !folderId}
              onClick={handlePreview}
            >
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze Syntax
            </Button>
            
            <Button
              variant="gradient"
              className="flex-1 h-12 rounded-2xl gap-2 font-black shadow-lg shadow-primary/20"
              disabled={loading || !query.trim() || !folderId || (preview && preview.error)}
              onClick={handleIngest}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Commit Data
            </Button>
          </div>
        </div>

        {/* Status/Preview Side */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest">Transaction Guard</h4>
              <p className="text-[11px] text-muted-foreground font-medium">Auto-preflights injections for data integrity.</p>
            </div>
          </div>

          <Card className="min-h-[200px] bg-whiteAlpha.50 border-border/10 overflow-hidden relative group">
            <CardContent className="p-6">
              {!preview && !result && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10">
                  <Sparkles className="w-8 h-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground font-medium px-8 leading-relaxed">
                    Write your Cypher query and click <span className="font-bold text-accent">Analyze Syntax</span> to preview graph transformations.
                  </p>
                </div>
              )}

              {preview && !result && (
                <div className={cn(
                  "space-y-4 animate-in zoom-in-95 duration-300",
                  preview.error ? "text-red-500" : "text-accent-foreground"
                )}>
                  <div className="flex items-center justify-between border-b border-whiteAlpha.100 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Syntax Validation</span>
                    <Badge variant={preview.error ? "destructive" : "success"} className="h-4 text-[9px] uppercase font-black px-1.5">
                      {preview.error ? "Failed" : "Valid"}
                    </Badge>
                  </div>
                  
                  {preview.error ? (
                    <div className="flex gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-[13px] leading-relaxed font-medium">{preview.message}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-foreground">
                        <p className="text-[13px] leading-relaxed font-medium">{preview.message || 'Syntax analyzed successfully.'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-whiteAlpha.100 rounded-xl p-3 border border-whiteAlpha.100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Data Statements</p>
                          <p className="text-lg font-black">{preview.data_statements || 0}</p>
                        </div>
                        <div className="bg-whiteAlpha.100 rounded-xl p-3 border border-whiteAlpha.100">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Normalized Blocks</p>
                          <p className="text-lg font-black">{preview.is_pre_formatted ? 'YES' : 'NO'}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-bold italic line-clamp-3 bg-black/20 p-2 rounded-lg">
                        {preview.query_sanitized}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8 animate-in slide-in-from-top-4 duration-500">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl",
                    result.success ? "bg-primary/20 text-primary shadow-primary/20" : "bg-red-500/20 text-red-500 shadow-red-500/20"
                  )}>
                    {result.success ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                  </div>
                  <div className="space-y-2 px-4">
                    <h5 className="font-black uppercase tracking-widest text-sm">{result.success ? 'Execution Successful' : 'Execution Failed'}</h5>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">{result.message}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl border-border/20" onClick={() => setResult(null)}>
                    Dismiss Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
