import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Pencil } from 'lucide-react';

export function GraphFocusToolbar({ focusLabel, focusType, onClear, onEdit, className }) {
  if (!focusLabel) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border border-border/40 bg-background/50 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">
          {focusType === 'node' ? 'Node focus' : 'Relationship focus'}
        </Badge>
        <span className="text-sm font-medium">{focusLabel}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {onEdit && focusType === 'node' && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit Node
          </Button>
        )}
        <Button variant="ghost" size="sm" className="gap-2" onClick={onClear}>
          <ArrowLeft className="h-4 w-4" />
          Back to full graph
        </Button>
      </div>
    </div>
  );
}
