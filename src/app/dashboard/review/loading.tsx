export default function ReviewQueueLoading() {
  return (
    <div className="animate-pulse">
      <div className="border-t border-zinc-200 mb-2" />
      <div className="h-3 w-24 bg-zinc-100 rounded mb-2" />
      <div className="h-[3px] bg-zinc-100 mt-2 mb-6" />
      <div className="flex items-baseline justify-between mb-6">
        <div className="h-8 w-48 bg-zinc-100 rounded" />
        <div className="h-4 w-16 bg-zinc-100 rounded" />
      </div>
      <div className="h-8 w-48 bg-zinc-100 rounded mb-6" />
      <div className="border-b border-zinc-200 pb-2 mb-0">
        <div className="h-3 w-full bg-zinc-50 rounded" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="py-3 border-b border-zinc-100 flex gap-4">
          <div className="flex-1 h-4 bg-zinc-100 rounded" />
          <div className="w-28 h-4 bg-zinc-50 rounded hidden sm:block" />
          <div className="w-28 h-4 bg-zinc-50 rounded hidden md:block" />
          <div className="w-24 h-4 bg-zinc-50 rounded" />
        </div>
      ))}
    </div>
  )
}
