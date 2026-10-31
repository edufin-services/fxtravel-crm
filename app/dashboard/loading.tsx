export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-zinc-200/80" />
              <div className="h-7 w-48 rounded-lg bg-zinc-200/80" />
            </div>
            <div className="h-4 w-72 max-w-full rounded bg-zinc-100" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block h-9 w-32 rounded-2xl bg-zinc-100" />
            <div className="h-9 w-36 rounded-2xl bg-zinc-200/80" />
          </div>
        </div>
      </div>

      {/* 4 Stat Metric Cards Skeleton */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 sm:p-5 shadow-2xs space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-zinc-100" />
                <div className="h-3.5 w-24 rounded bg-zinc-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-zinc-100" />
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="h-8 w-16 rounded bg-zinc-200/80" />
              <div className="h-5 w-12 rounded bg-zinc-100" />
            </div>

            <div className="pt-2 border-t border-zinc-100/90 space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-20 rounded bg-zinc-100" />
                <div className="h-3 w-14 rounded bg-zinc-100" />
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Section (2 cols) */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="space-y-1.5">
              <div className="h-5 w-36 rounded bg-zinc-200/80" />
              <div className="h-3.5 w-56 rounded bg-zinc-100" />
            </div>
            <div className="h-7 w-24 rounded-xl bg-zinc-100" />
          </div>

          <div className="h-3 w-full rounded-full bg-zinc-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-zinc-200/70" />
                  <div className="h-4 w-10 rounded bg-zinc-200/70" />
                </div>
                <div className="h-6 w-12 rounded bg-zinc-200/80" />
                <div className="h-1.5 w-full rounded-full bg-zinc-200/60" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Section (1 col) */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="h-5 w-28 rounded bg-zinc-200/80" />
            <div className="h-3.5 w-16 rounded bg-zinc-100" />
          </div>

          <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3.5 space-y-2">
            <div className="h-4 w-32 rounded bg-zinc-200/80" />
            <div className="h-3 w-44 rounded bg-zinc-100" />
          </div>

          <div className="space-y-2.5 pt-2">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-12 w-full rounded-xl bg-zinc-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

