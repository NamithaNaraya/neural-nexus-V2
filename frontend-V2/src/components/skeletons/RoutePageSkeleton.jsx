import React from 'react';
import { Skeleton, SkeletonText } from '../ui/Skeleton';

function Shell({ children, className = '' }) {
  return <div className={`space-y-5 pb-6 ${className}`}>{children}</div>;
}

export function PublicPageSkeleton({ titleWidthClass = 'w-56' }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-14">
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className={`h-9 ${titleWidthClass} max-w-full rounded-2xl`} />
            <SkeletonText lines={2} className="max-w-xl" />
          </div>
          <div className="rounded-[32px] border border-border/50 bg-card/70 p-6 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <div className="flex flex-wrap gap-3 pt-2">
                <Skeleton className="h-12 w-40 rounded-2xl" />
                <Skeleton className="h-12 w-32 rounded-2xl" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-[24px] border border-border/50 bg-card/60 p-5 shadow-sm">
                <Skeleton className="mb-3 h-4 w-28" />
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroBlock({ compact = false }) {
  return (
    <div className={`rounded-[30px] border border-border/50 bg-card/70 p-6 shadow-sm ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="h-9 w-72 max-w-[70%]" />
      <SkeletonText lines={2} className="max-w-2xl" />
    </div>
  );
}

function ToolbarRow({ count = 4 }) {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-11 w-36 rounded-2xl" />
      ))}
    </div>
  );
}

function MetricGrid({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[24px] border border-border/40 bg-card/65 p-5">
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableCard({ rows = 5, columns = 6 }) {
  return (
    <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-10 w-28 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartBlock() {
  return (
    <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>
      <Skeleton className="h-[420px] w-full rounded-[24px]" />
    </div>
  );
}

function SidePanelLayout() {
  return (
    <div className="grid min-h-[640px] gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4 rounded-[28px] border border-border/50 bg-card/70 p-4 shadow-sm">
        <Skeleton className="h-9 w-full rounded-2xl" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-rows-[auto_1fr]">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-36" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <ChartBlock />
      </div>
    </div>
  );
}

export function FoldersPageSkeleton() {
  return (
    <Shell>
      <HeroBlock />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-2xl" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-border/50 bg-card/70 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Skeleton className="h-8 w-20 rounded-xl" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
          <div className="mb-5 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-60" />
          </div>
          <MetricGrid count={3} />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-[24px]" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function GraphPageSkeleton() {
  return (
    <Shell className="h-full min-h-0">
      <div className="rounded-[28px] border border-border/50 bg-card/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-11 w-56 rounded-2xl" />
          <Skeleton className="h-11 w-40 rounded-2xl" />
          <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>
      </div>
      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-[28px] border border-border/50 bg-card/70 p-4 shadow-sm">
          <Skeleton className="h-10 w-full rounded-2xl" />
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
        <div className="rounded-[32px] border border-border/50 bg-card/70 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-52" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-2xl" />
              <Skeleton className="h-10 w-28 rounded-2xl" />
            </div>
          </div>
          <Skeleton className="h-[540px] w-full rounded-[28px]" />
        </div>
      </div>
    </Shell>
  );
}

export function ChatPageSkeleton() {
  return (
    <Shell className="h-full min-h-0">
      <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <ToolbarRow count={4} />
        </div>
      </div>
      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[32px] border border-border/50 bg-card/70 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`space-y-2 ${index % 2 === 0 ? 'w-[72%]' : 'w-[64%]'}`}>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-24 w-full rounded-[24px]" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[24px] border border-border/40 p-4">
            <Skeleton className="h-24 w-full rounded-[20px]" />
            <div className="mt-3 flex justify-between gap-3">
              <Skeleton className="h-11 w-36 rounded-2xl" />
              <Skeleton className="h-11 w-28 rounded-2xl" />
            </div>
          </div>
        </div>
        <div className="hidden rounded-[32px] border border-border/50 bg-card/70 p-4 shadow-sm xl:block">
          <Skeleton className="mb-4 h-6 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function UploadPageSkeleton() {
  return (
    <Shell>
      <HeroBlock />
      <ToolbarRow count={4} />
      <div className="rounded-[32px] border border-border/50 bg-card/70 p-6 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-16 w-full rounded-[24px]" />
        </div>
        <div className="mt-8">
          <TableCard rows={5} columns={6} />
        </div>
      </div>
    </Shell>
  );
}

export function BrowsePageSkeleton() {
  return (
    <Shell>
      <HeroBlock />
      <ToolbarRow count={5} />
      <MetricGrid count={4} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-border/50 bg-card/70 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <SkeletonText lines={4} />
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <Shell className="h-full min-h-0">
      <SidePanelLayout />
    </Shell>
  );
}

export function VisualizePageSkeleton() {
  return (
    <Shell className="h-full min-h-0">
      <div className="rounded-[28px] border border-border/50 bg-card/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-11 w-44 rounded-2xl" />
            <Skeleton className="h-11 w-36 rounded-2xl" />
            <Skeleton className="h-11 w-36 rounded-2xl" />
          </div>
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
      </div>
      <ChartBlock />
    </Shell>
  );
}

export function MLPredictionPageSkeleton() {
  return (
    <Shell>
      <HeroBlock />
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3 rounded-[28px] border border-border/50 bg-card/70 p-4 shadow-sm">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
        <div className="space-y-5">
          <MetricGrid count={3} />
          <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-48" />
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-2xl" />
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Skeleton className="h-12 w-44 rounded-2xl" />
            </div>
          </div>
          <TableCard rows={4} columns={4} />
        </div>
      </div>
    </Shell>
  );
}

export function SettingsPageSkeleton() {
  return (
    <Shell>
      <HeroBlock compact />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
            <Skeleton className="mb-4 h-6 w-40" />
            <div className="space-y-3">
              <Skeleton className="h-11 w-full rounded-2xl" />
              <Skeleton className="h-11 w-full rounded-2xl" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function HelpPageSkeleton() {
  return (
    <Shell>
      <HeroBlock />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
          <Skeleton className="mb-4 h-6 w-44" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-sm">
          <Skeleton className="mb-4 h-6 w-52" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-[22px] border border-border/40 p-4">
                <Skeleton className="h-4 w-40" />
                <SkeletonText lines={3} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function RoutePageSkeleton({ pathname = '' }) {
  const path = String(pathname || '').toLowerCase();

  if (path.startsWith('/login')) return <PublicPageSkeleton titleWidthClass="w-44" />;
  if (path === '/') return <PublicPageSkeleton titleWidthClass="w-64" />;
  if (path.startsWith('/folders')) return <FoldersPageSkeleton />;
  if (path.startsWith('/graph')) return <GraphPageSkeleton />;
  if (path.startsWith('/visualize')) return <VisualizePageSkeleton />;
  if (path.startsWith('/chat')) return <ChatPageSkeleton />;
  if (path.startsWith('/upload')) return <UploadPageSkeleton />;
  if (path.startsWith('/browse')) return <BrowsePageSkeleton />;
  if (path.startsWith('/ml-prediction')) return <MLPredictionPageSkeleton />;
  if (path.startsWith('/analytics')) return <AnalyticsPageSkeleton />;
  if (path.startsWith('/settings')) return <SettingsPageSkeleton />;
  if (path.startsWith('/help')) return <HelpPageSkeleton />;

  return <FoldersPageSkeleton />;
}
