export default function Loading() {
  return (
    <div className="space-y-1">
      <div className="border-t border-zinc-200 mb-2" />
      <div className="animate-pulse h-3 w-24 bg-zinc-100 rounded" />
      <div className="animate-pulse h-[3px] w-full bg-zinc-100 mt-2 mb-6 rounded" />
      <div className="animate-pulse h-8 w-48 bg-zinc-100 rounded mb-8" />
      <div className="flex flex-col divide-y divide-[#E4E4E7]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="py-4 flex gap-4">
            <div className="animate-pulse h-20 w-28 flex-shrink-0 bg-zinc-100 rounded" />
            <div className="flex-1 space-y-2 py-1">
              <div className="animate-pulse h-3 w-16 bg-zinc-100 rounded" />
              <div className="animate-pulse h-4 w-full bg-zinc-100 rounded" />
              <div className="animate-pulse h-4 w-4/5 bg-zinc-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
