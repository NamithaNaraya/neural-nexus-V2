import React from 'react';
import { Loader2, SearchX, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';

export function BrowseLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <Card key={item} className="border-border/60 bg-card/65 backdrop-blur-xl">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded-full" />
                <Skeleton className="h-3 w-1/3 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BrowseEmptyState({ query, error }) {
  const title = error || (query ? 'No matches for this filter set' : 'No browse data available');
  const description = error
    ? 'Try again in a moment or switch folder/type scope.'
    : query
      ? 'Try a broader search term, a different type, or another folder scope.'
      : 'Upload data or select a folder that already contains indexed graph nodes.';

  return (
    <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-xl">
      <CardContent className="relative flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="ambient-empty-brand absolute inset-0" />
        <div className="relative space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-border/50 bg-background/70 shadow-lg shadow-slate-900/5">
            {error ? <Loader2 className="h-8 w-8 text-primary" /> : query ? <SearchX className="h-8 w-8 text-primary" /> : <Sparkles className="h-8 w-8 text-primary" />}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
