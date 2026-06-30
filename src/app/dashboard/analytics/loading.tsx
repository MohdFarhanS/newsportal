export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse">
      <div className="border-t border-zinc-200 mb-2" />
      <div className="h-3 w-16 bg-zinc-100 rounded mb-2" />
      <div className="h-[3px] bg-zinc-100 mt-2 mb-6" />
      <div className="h-8 w-36 bg-zinc-100 rounded mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-zinc-200 p-5">
            <div className="h-3 w-24 bg-zinc-100 rounded mb-4" />
            <div className="h-9 w-16 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
