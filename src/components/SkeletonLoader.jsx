import React from 'react';

export function SkeletonNotes() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-ink/10 animate-shimmer" />
        <div className="h-6 w-48 rounded-lg bg-ink/10 animate-shimmer" />
      </div>

      {/* Overview skeleton */}
      <div className="space-y-2 p-5 rounded-2xl bg-map border border-sand">
        <div className="h-4 w-28 rounded bg-ink/10 animate-shimmer" />
        <div className="h-3 w-full rounded bg-ink/5 animate-shimmer" />
        <div className="h-3 w-4/5 rounded bg-ink/5 animate-shimmer" />
      </div>

      {/* Table skeleton */}
      <div className="border border-sand rounded-xl overflow-hidden">
        <div className="h-10 bg-ink/5 animate-shimmer" />
        <div className="p-4 space-y-3">
          <div className="flex justify-between gap-4">
            <div className="h-3 w-1/4 rounded bg-ink/5 animate-shimmer" />
            <div className="h-3 w-1/4 rounded bg-ink/5 animate-shimmer" />
            <div className="h-3 w-1/4 rounded bg-ink/5 animate-shimmer" />
          </div>
          <div className="flex justify-between gap-4">
            <div className="h-3 w-1/4 rounded bg-ink/5 animate-shimmer" />
            <div className="h-3 w-1/4 rounded bg-ink/5 animate-shimmer" />
            <div className="h-3 w-1/4 rounded bg-ink/5 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Content paragraphs */}
      <div className="space-y-4">
        <div className="h-4 w-1/3 rounded bg-ink/10 animate-shimmer" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-ink/5 animate-shimmer" />
          <div className="h-3 w-full rounded bg-ink/5 animate-shimmer" />
          <div className="h-3 w-2/3 rounded bg-ink/5 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPlanner() {
  return (
    <div className="space-y-6">
      {/* Header diagnostics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-map border border-sand space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-ink/10 animate-shimmer" />
            <div className="h-4 w-32 rounded bg-ink/10 animate-shimmer" />
          </div>
          <div className="h-8 w-20 rounded bg-ink/10 animate-shimmer" />
          <div className="h-3 w-full rounded bg-ink/5 animate-shimmer" />
        </div>

        <div className="p-5 rounded-2xl bg-map border border-sand space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-ink/10 animate-shimmer" />
            <div className="h-4 w-40 rounded bg-ink/10 animate-shimmer" />
          </div>
          <div className="h-8 w-28 rounded bg-ink/10 animate-shimmer" />
          <div className="h-3 w-full rounded bg-ink/5 animate-shimmer" />
        </div>
      </div>

      {/* Week roadmap skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-44 rounded bg-ink/10 animate-shimmer" />

        {/* Week 1 item skeleton */}
        <div className="p-5 rounded-2xl bg-map border border-sand space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-ink/10 animate-shimmer" />
              <div className="h-3 w-48 rounded bg-ink/5 animate-shimmer" />
            </div>
            <div className="h-5 w-16 rounded-full bg-ink/10 animate-shimmer" />
          </div>
          <div className="h-px bg-sand" />
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded border border-sand bg-ink/5 flex-shrink-0 animate-shimmer" />
              <div className="h-3 w-3/4 rounded bg-ink/5 animate-shimmer" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded border border-sand bg-ink/5 flex-shrink-0 animate-shimmer" />
              <div className="h-3 w-2/3 rounded bg-ink/5 animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Week 2 item skeleton */}
        <div className="p-5 rounded-2xl bg-map border border-sand opacity-50 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-ink/10 animate-shimmer" />
              <div className="h-3 w-48 rounded bg-ink/5 animate-shimmer" />
            </div>
            <div className="h-5 w-16 rounded-full bg-ink/10 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
