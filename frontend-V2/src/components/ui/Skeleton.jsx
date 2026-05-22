import React from 'react';
import { cn } from '../../utils/cn';

export function Skeleton({ className, shine = true, ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md',
        shine
          ? 'animate-skeleton-shine'
          : 'bg-muted/50 animate-skeleton-breathe',
        className
      )}
      {...props}
    />
  );
}

// Pre-built skeleton variants
export function SkeletonCard({ className }) {
  return (
    <div className={cn('rounded-[24px] border border-border/30 bg-card/50 p-6 space-y-4 animate-fade-up', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24 rounded-lg" />
          <Skeleton className="h-3 w-16 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5 rounded-lg"
          style={{
            width: `${100 - i * 15}%`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', className }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };
  return <Skeleton className={cn(sizes[size] || sizes.md, 'rounded-full', className)} />;
}

export function SkeletonMetricCard({ className }) {
  return (
    <div className={cn('rounded-[24px] border border-border/40 bg-card/60 p-5 space-y-3 backdrop-blur-sm', className)}>
      <Skeleton className="h-3 w-20 rounded-lg" />
      <Skeleton className="h-8 w-16 rounded-lg" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-24 rounded-lg" />
      </div>
    </div>
  );
}
