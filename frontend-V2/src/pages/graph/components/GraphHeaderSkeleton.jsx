import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';

export function GraphHeaderSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-48 rounded-full" />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Skeleton className="h-10 w-full max-w-md rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}
