import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Label } from '../ui/Input';
import { Brain, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { uploadService } from '../../services/uploadService';

export function TextIngest({ folderId, onSuccess }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleIngest = async () => {
    if (!content.trim() || !title.trim() || !folderId) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadService.ingestText(folderId, content, title);
      setResult({ success: true, message: 'Text was added successfully.' });
      setTitle('');
      setContent('');
      if (onSuccess) onSuccess(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let message = 'Failed to ingest text';
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Title</Label>
            <Input
              placeholder="Enter a short title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-2xl border-border/40 bg-background/50 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Text</Label>
            <textarea
              placeholder="Paste text here..."
              className="flex min-h-[300px] w-full rounded-3xl border border-border/40 bg-background/50 px-5 py-4 text-sm font-medium leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 custom-scrollbar"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {result && (
            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${result.success ? 'border-primary/20 bg-primary/10 text-primary' : 'border-red-500/20 bg-red-500/10 text-red-500'}`}>
              {result.success ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              <p className="text-xs font-bold">{result.message}</p>
            </div>
          )}

          <Button
            variant="gradient"
            className="group relative h-14 w-full rounded-2xl gap-3 overflow-hidden text-base font-black shadow-xl shadow-primary/20"
            disabled={loading || !content.trim() || !title.trim() || !folderId}
            onClick={handleIngest}
          >
            <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-primary/20 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Brain className="w-5 h-5 transition-transform group-hover:scale-110" />
            )}
            <span>{loading ? 'Saving Text...' : 'Add Text'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
