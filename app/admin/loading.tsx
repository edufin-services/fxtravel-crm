export default function AdminLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* Top Header Banner Skeleton */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-rose-100" />
              <div className="h-7 w-48 rounded-lg bg-zinc-200/80" />
            </div>
            <div className="h-4 w-72 max-w-full rounded bg-zinc-100" />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-32 rounded-2xl bg-zinc-100" />
            <div className="h-9 w-36 rounded-2xl bg-zinc-200/80" />
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
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

      {/* Table / Board Skeleton */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="h-5 w-40 rounded bg-zinc-200/80" />
          <div className="h-8 w-28 rounded-xl bg-zinc-100" />
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4 py-2 border-b border-zinc-50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-100" />
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-zinc-200/70" />
                  <div className="h-3 w-20 rounded bg-zinc-100" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-zinc-100" />
              <div className="h-4 w-16 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

