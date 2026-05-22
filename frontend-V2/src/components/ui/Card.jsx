import React from 'react';
import { cn } from '../../utils/cn';

const cardVariants = {
  variant: {
    default: 'rounded-[32px] border-border/40 bg-card/70 shadow-xl shadow-primary/5',
    branded: 'rounded-[40px] border-primary/20 bg-card/85 shadow-2xl shadow-primary/10 ring-1 ring-white/20',
    glass: 'rounded-[32px] border-white/40 bg-white/40 backdrop-blur-3xl shadow-sm shadow-black/5',
  },
  hover: {
    none: '',
    lift: 'hover:-translate-y-2 hover:shadow-[0_32px_64px_-32px_hsl(var(--primary)/25%)] hover:border-primary/30',
    glow: 'hover:border-primary/40 hover:shadow-xl hover:shadow-primary/15',
  }
};

export function Card({ className, variant = 'default', hover = 'none', children, ...props }) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-500 ease-out text-card-foreground',
        cardVariants.variant[variant],
        cardVariants.hover[hover],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
