import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  description = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "destructive"
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalRoot = document.body;
  if (!modalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 transition-all"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[380px] overflow-hidden rounded-[40px] border border-white/10 bg-card/80 p-10 shadow-[0_40px_100px_-24px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`mb-8 flex h-20 w-20 items-center justify-center rounded-[28px] ${
            variant === 'destructive' 
              ? 'bg-destructive/10 text-destructive shadow-[0_0_40px_rgba(239,68,68,0.1)]' 
              : 'bg-primary/10 text-primary shadow-[0_0_40px_rgba(74,103,65,0.1)]'
          }`}>
            {variant === 'destructive' ? <Trash2 className="h-10 w-10" /> : <AlertTriangle className="h-10 w-10" />}
          </div>

          <div className="mb-10 space-y-3">
            <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">{title}</h2>
            <p className="text-[14px] font-medium text-muted-foreground/80 leading-relaxed px-2">{description}</p>
          </div>

          <div className="flex w-full gap-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-[22px] border border-border/40 bg-secondary/20 px-6 py-4 text-[12px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-secondary/40 hover:text-foreground active:scale-95"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 rounded-[22px] px-6 py-4 text-[12px] font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${
                variant === 'destructive' 
                  ? 'bg-destructive shadow-destructive/20 hover:bg-destructive/90' 
                  : 'bg-primary shadow-primary/20 hover:bg-primary/90'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-destructive/5 blur-3xl pointer-events-none" />
      </div>
    </div>,
    modalRoot
  );
};
