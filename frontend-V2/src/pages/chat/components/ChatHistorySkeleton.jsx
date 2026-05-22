import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { cn } from '../../../utils/cn';

export function ChatHistorySkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div 
          key={i} 
          className="rounded-2xl border border-border/20 bg-card/40 p-3 space-y-2 animate-pulse"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-16 rounded-md opacity-60" />
          <Skeleton className="h-3 w-full rounded-md opacity-40" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
