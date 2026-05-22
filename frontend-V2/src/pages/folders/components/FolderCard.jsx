import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FolderOpen, FileText, Network, Trash2, ChevronRight } from 'lucide-react';

export function FolderCard({ folder, selected, deleting, onOpen, onDelete }) {
  const baseClasses = 'cursor-pointer transition-all duration-200 ease-out';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={() => onOpen(folder)}
    >
      <Card className={`${baseClasses} border border-border/30 rounded-2xl bg-white ${selected ? 'border-primary/40 shadow-xl' : 'shadow-lg hover:shadow-xl'}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold truncate text-foreground">{folder.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{folder.description || 'No description available'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(folder.id);
                }}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-red-500 transition-all duration-200"
                title="Delete folder"
              >
                {deleting === folder.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
            <div className="rounded-lg bg-slate-50 py-2">
              <span className="font-semibold text-slate-700">{folder.file_count ?? 0}</span>
              <div>files</div>
            </div>
            <div className="rounded-lg bg-slate-50 py-2">
              <span className="font-semibold text-slate-700">{folder.node_count ?? 0}</span>
              <div>nodes</div>
            </div>
            <div className="rounded-lg bg-slate-50 py-2">
              <span className="font-semibold text-slate-700">{new Date(folder.updated_at).toLocaleDateString()}</span>
              <div>updated</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
