import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FileText, FileJson, FileType, X, Loader2, Download } from 'lucide-react';
import { exportToText } from '../downloads/exportToText';
import { exportToJson } from '../downloads/exportToJson';
import { exportToPdf } from '../downloads/exportToPdf';

export const ChatDownloadModal = ({ 
  isOpen, 
  onClose, 
  messages = [], 
  currentFolder, 
  workspace, 
  activeSession 
}) => {
  const [activeExport, setActiveExport] = useState(null);

  // Use effect to handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, messages, workspace, activeSession, currentFolder]);

  if (!isOpen) return null;

  const handleExportText = async (e) => {
    e.stopPropagation();
    try {
      setActiveExport('text');
      const success = await exportToText({
        messages,
        folderName: currentFolder?.name || 'Global',
      });
      if (success) {
        setTimeout(onClose, 600);
      }
    } catch (err) {
      console.error('Text export error:', err);
      toast.error('Export failed');
    } finally {
      setActiveExport(null);
    }
  };

  const handleExportJson = async (e) => {
    e.stopPropagation();
    try {
      setActiveExport('json');
      const success = await exportToJson({
        messages,
        folderName: currentFolder?.name || 'Global',
        sessionId: workspace?.currentSessionId,
        activeSessionTitle: activeSession?.title || 'New Chat'
      });
      if (success) {
        setTimeout(onClose, 600);
      }
    } catch (err) {
      console.error('JSON export error:', err);
      toast.error('Export failed');
    } finally {
      setActiveExport(null);
    }
  };

  const handleExportPdf = async (e) => {
    e.stopPropagation();
    try {
      setActiveExport('pdf');
      const success = await exportToPdf({
        messages,
        folderName: currentFolder?.name || 'Global',
        sessionTitle: activeSession?.title || 'New Chat'
      });
      if (success) {
        setTimeout(onClose, 800);
      }
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Export failed');
    } finally {
      setActiveExport(null);
    }
  };

  const modalRoot = document.body;
  if (!modalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 transition-all"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-border/50 bg-card p-10 shadow-[0_32px_120px_-36px_hsl(var(--primary)/0.3)] backdrop-blur-2xl animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-10 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Download session</h2>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary">CHOOSE FORMAT</p>
            <span className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid gap-5">
          <button
            type="button"
            onClick={handleExportText}
            disabled={activeExport !== null}
            className="group flex w-full cursor-pointer items-center gap-6 rounded-[24px] border border-border/40 bg-secondary/30 p-5 text-left transition-all hover:scale-[1.02] hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
              {activeExport === 'text' ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileText className="h-7 w-7" />}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">As Plain Text</p>
              <p className="text-sm text-muted-foreground leading-relaxed">Clean research log (.txt)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={activeExport !== null}
            className="group flex w-full cursor-pointer items-center gap-6 rounded-[24px] border border-border/40 bg-secondary/30 p-5 text-left transition-all hover:scale-[1.02] hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
              {activeExport === 'json' ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileJson className="h-7 w-7" />}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">As JSON Data</p>
              <p className="text-sm text-muted-foreground leading-relaxed">Raw session portability (.json)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={activeExport !== null}
            className="group flex w-full cursor-pointer items-center gap-6 rounded-[24px] border border-border/40 bg-secondary/30 p-5 text-left transition-all hover:scale-[1.02] hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
              {activeExport === 'pdf' ? <Loader2 className="h-7 w-7 animate-spin" /> : <Download className="h-7 w-7" />}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">As PDF Document</p>
              <p className="text-sm text-muted-foreground leading-relaxed">Professional report (.pdf)</p>
            </div>
          </button>
        </div>
        
        {/* Subtle decorative glow */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-accent/5 blur-[80px] pointer-events-none" />
      </div>
    </div>,
    modalRoot
  );
};
