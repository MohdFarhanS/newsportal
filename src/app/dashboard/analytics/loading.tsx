export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse">
      <div className="border-t border-zinc-200 mb-2" />
      <div className="h-3 w-16 bg-zinc-100 rounded mb-2" />
      <div className="h-[3px] bg-zinc-100 mt-2 mb-6" />
      <div className="h-8 w-36 bg-zinc-100 rounded mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-zinc-200 p-5">
            <div className="h-3 w-24 bg-zinc-100 rounded mb-4" />
            <div className="h-9 w-16 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="h-3 w-20 bg-zinc-100 rounded" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 w-20 bg-zinc-100 rounded" />
          ))}
        </div>
      </div>

      <div className="border border-zinc-200">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 flex gap-4 items-center">
          <div className="h-3 w-6 bg-zinc-100 rounded" />
          <div className="h-3 flex-1 bg-zinc-100 rounded" />
          <div className="hidden sm:block h-3 w-20 bg-zinc-100 rounded" />
          <div className="hidden md:block h-3 w-24 bg-zinc-100 rounded" />
          <div className="h-3 w-16 bg-zinc-100 rounded" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b border-zinc-100 last:border-0 px-4 py-3 flex gap-4 items-center">
            <div className="h-3 w-4 bg-zinc-100 rounded" />
            <div className="h-3 flex-1 bg-zinc-100 rounded" />
            <div className="hidden sm:block h-3 w-20 bg-zinc-100 rounded" />
            <div className="hidden md:block h-3 w-24 bg-zinc-100 rounded" />
            <div className="h-3 w-14 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
