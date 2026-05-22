import React from 'react';
import { cn } from '../../utils/cn';

const badgeVariants = {
  default: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary text-secondary-foreground border-secondary',
  destructive: 'bg-destructive/15 text-destructive border-destructive/20',
  outline: 'text-foreground border-border',
  success: 'bg-primary/15 text-primary border-primary/30 dark:text-primary',
  warning: 'bg-accent/20 text-accent-foreground border-accent/40 dark:text-accent',
  info: 'bg-secondary text-secondary-foreground border-secondary',
};

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Specialized status badge with animated dot
export function StatusBadge({ status, label, className }) {
  const statusConfig = {
    healthy: { color: 'bg-primary', variant: 'success', text: label || 'Healthy' },
    up: { color: 'bg-primary', variant: 'success', text: label || 'Online' },
    degraded: { color: 'bg-accent', variant: 'warning', text: label || 'Degraded' },
    unhealthy: { color: 'bg-destructive', variant: 'destructive', text: label || 'Offline' },
    down: { color: 'bg-destructive', variant: 'destructive', text: label || 'Down' },
  };

  const config = statusConfig[status] || statusConfig.unhealthy;

  return (
    <Badge variant={config.variant} className={cn('gap-1.5', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', config.color)} />
      {config.text}
    </Badge>
  );
}
