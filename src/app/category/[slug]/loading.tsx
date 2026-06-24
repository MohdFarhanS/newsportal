export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="animate-pulse h-7 w-44 bg-zinc-100 rounded mb-8" />
      <div className="flex flex-col gap-5 divide-y divide-[#E4E4E7]">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="pt-5 first:pt-0 flex gap-4">
            <div className="animate-pulse h-24 w-36 flex-shrink-0 bg-zinc-100 rounded" />
            <div className="flex-1 space-y-2 py-1">
              <div className="animate-pulse h-3 w-20 bg-zinc-100 rounded" />
              <div className="animate-pulse h-5 w-full bg-zinc-100 rounded" />
              <div className="animate-pulse h-4 w-3/4 bg-zinc-100 rounded" />
              <div className="animate-pulse h-3 w-24 bg-zinc-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
