import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Expand, X } from 'lucide-react';

/**
 * GraphQuickCrudMenu: A smaller, premium floating menu that appears near a clicked node.
 */
export function GraphQuickCrudMenu({ 
  node, 
  onClose, 
  onAddRelated, 
  onEdit, 
  onDelete, 
  onExpand,
  anchorPos // { x, y } in screen coordinates
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!node || !anchorPos) return null;

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className="fixed z-[100] flex items-center gap-1 p-1.5 bg-card/90 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl ring-1 ring-black/10"
      style={{ 
        left: anchorPos.x, 
        top: anchorPos.y,
        transform: 'translate(-50%, -100%)' // Center horizontally, place above the node
      }}
    >
      <QuickAction 
        icon={<Plus className="w-4 h-4" />} 
        label="Add Connection" 
        onClick={onAddRelated}
        primary
      />
      <div className="w-[1px] h-6 bg-border/40 mx-0.5" />
      <QuickAction 
        icon={<Expand className="w-4 h-4" />} 
        label="Quick Expand" 
        onClick={onExpand}
      />
      <QuickAction 
        icon={<Edit3 className="w-4 h-4" />} 
        label="Open Inspector" 
        onClick={onEdit}
      />
      <QuickAction 
        icon={<Trash2 className="w-4 h-4 text-red-500" />} 
        label="Delete" 
        onClick={onDelete}
        destructive
      />
      <button 
        onClick={onClose}
        className="ml-1 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

function QuickAction({ icon, label, onClick, primary = false, destructive = false }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      className={`
        relative flex items-center justify-center p-2 rounded-full transition-all duration-200
        ${primary ? 'bg-primary text-primary-foreground shadow-lg hover:scale-110 active:scale-95' : 'hover:bg-muted/80 text-foreground'}
        ${destructive ? 'hover:bg-red-500/10' : ''}
      `}
    >
      {icon}
    </button>
  );
}
