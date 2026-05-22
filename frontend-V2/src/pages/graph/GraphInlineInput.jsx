import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

/**
 * GraphInlineInput: Redesigned to be "In-Graph" rather than a modal.
 * Splits the input into two floating fields.
 */
export function GraphInlineInput({
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder = "Node Name...",
  subValue = "",
  onSubChange,
  subPlaceholder = "Rel Type...",
  nodeAnchorPos, // { x, y } in screen space
  linkAnchorPos, // { x, y } in screen space
}) {
  const nodeInputRef = useRef(null);
  const relInputRef = useRef(null);

  useEffect(() => {
    // Focus relationship first logically, or node name? 
    // Usually user thinks: "Source -> REL -> New Node"
    relInputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onConfirm();
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Tab') {
        e.preventDefault();
        if (document.activeElement === relInputRef.current) {
            nodeInputRef.current?.focus();
        } else {
            relInputRef.current?.focus();
        }
    }
  };

  return (
    <>
      {/* 1. Relationship Overlay */}
      {linkAnchorPos && (
        <div 
          className="absolute z-[102] pointer-events-none"
          style={{ 
            left: linkAnchorPos.x, 
            top: linkAnchorPos.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <input
            ref={relInputRef}
            className="pointer-events-auto bg-slate-800/90 backdrop-blur-md border border-white/20 rounded-full px-3 py-0 text-[9px] font-black text-white placeholder:text-white/40 text-center shadow-2xl focus:ring-2 focus:ring-white/30 outline-none transition-all cursor-text"
            style={{ 
              minWidth: '60px', 
              width: `${Math.max(60, subValue.length * 6 + 12)}px`,
              textTransform: 'uppercase'
            }}
          />
        </div>
      )}

      {/* 2. Node Name Overlay (Semitransparent Glass) */}
      {nodeAnchorPos && (
        <div 
          className="absolute z-[102] pointer-events-none flex flex-col items-center"
          style={{ 
            left: nodeAnchorPos.x, 
            top: nodeAnchorPos.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
           <div className="relative group flex flex-col items-center pointer-events-none">
             <input
              ref={nodeInputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="pointer-events-auto bg-white/80 backdrop-blur-md border-2 border-white/40 rounded-2xl px-2 py-1 text-[11px] font-black text-slate-900 placeholder:text-slate-400 text-center shadow-2xl focus:ring-4 focus:ring-primary/20 outline-none min-w-[80px] max-w-[150px] transition-all cursor-text"
              autoFocus
            />
            {/* Action Tooltip */}
            <div className="absolute -bottom-8 opacity-0 group-focus-within:opacity-100 transition-opacity whitespace-nowrap pointer-events-none scale-75 origin-top">
               <span className="bg-slate-900 text-white text-[9px] font-bold px-3 py-1 rounded-full border border-white/10 shadow-xl">
                 ENTER TO PERSIST
               </span>
            </div>
           </div>
        </div>
      )}
      
      {/* 3. Global ESC/Blur Layer can be handled by parent */}
    </>
  );
}
