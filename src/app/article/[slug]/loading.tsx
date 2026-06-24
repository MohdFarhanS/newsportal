export default function Loading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="animate-pulse h-3 w-20 bg-zinc-100 rounded mb-3" />
      <div className="space-y-2 mb-4">
        <div className="animate-pulse h-9 w-full bg-zinc-100 rounded" />
        <div className="animate-pulse h-9 w-3/4 bg-zinc-100 rounded" />
      </div>
      <div className="space-y-2 mb-5">
        <div className="animate-pulse h-5 w-full bg-zinc-100 rounded" />
        <div className="animate-pulse h-5 w-5/6 bg-zinc-100 rounded" />
      </div>
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#E4E4E7]">
        <div className="animate-pulse w-10 h-10 rounded-full bg-zinc-100 flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="animate-pulse h-3.5 w-28 bg-zinc-100 rounded" />
          <div className="animate-pulse h-3 w-36 bg-zinc-100 rounded" />
        </div>
      </div>
      <div className="animate-pulse aspect-video w-full bg-zinc-100 rounded mb-8" />
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`animate-pulse h-4 bg-zinc-100 rounded ${i % 5 === 4 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </main>
  )
}
