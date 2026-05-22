import React from 'react';
import { Link2, RotateCcw, Spline, Type } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

function TogglePill({ active, icon: Icon, label, activeLabel, inactiveLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
          : 'border-border/50 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function GraphToolbarControls({
  showNodeLabels,
  onToggleNodeLabels,
  showRelationshipLabels,
  onToggleRelationshipLabels,
  lockDraggedNodes,
  onToggleLockDraggedNodes,
  linkStyle,
  onToggleLinkStyle,
  onResetPins,
  onResetView,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <TogglePill
        active={showNodeLabels}
        icon={Type}
        label="Names"
        activeLabel="Shown"
        inactiveLabel="Hidden"
        onClick={onToggleNodeLabels}
      />

      <TogglePill
        active={showRelationshipLabels}
        icon={Link2}
        label="Relations"
        activeLabel="Shown"
        inactiveLabel="Hidden"
        onClick={onToggleRelationshipLabels}
      />

      <TogglePill
        active={linkStyle === 'curved'}
        icon={Spline}
        label={linkStyle === 'curved' ? "Curved" : "Straight"}
        onClick={onToggleLinkStyle}
      />

      <button
        type="button"
        onClick={onToggleLockDraggedNodes}
        className={[
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
          lockDraggedNodes
            ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
            : 'border-border/50 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        ].join(' ')}
      >
        <span>Pinned drag</span>
      </button>

      <Button
        variant="ghost"
        size="sm"
        className="rounded-full border border-border/50 bg-card px-3 text-xs"
        type="button"
        onClick={onResetPins}
      >
        Reset Pins
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-2 rounded-full border border-border/50 bg-card px-3 text-xs"
        type="button"
        onClick={onResetView}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset View
      </Button>
    </div>
  );
}
