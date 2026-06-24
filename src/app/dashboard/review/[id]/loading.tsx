export default function ReviewDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="border-t border-zinc-200 mb-2" />
      <div className="h-3 w-24 bg-zinc-100 rounded mb-2" />
      <div className="h-[3px] bg-zinc-100 mt-2 mb-6" />
      <div className="h-4 w-32 bg-zinc-100 rounded mb-6" />
      <div className="space-y-2 mb-6">
        <div className="h-8 w-3/4 bg-zinc-100 rounded" />
        <div className="h-4 w-48 bg-zinc-50 rounded" />
      </div>
      <div className="h-12 w-full bg-zinc-50 rounded mb-8" />
      <div className="space-y-3 mb-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-zinc-100 rounded" style={{ width: `${85 - i * 5}%` }} />
        ))}
      </div>
      <div className="border-t border-zinc-200 pt-6 flex gap-3">
        <div className="h-9 w-24 bg-zinc-200 rounded" />
        <div className="h-9 w-20 bg-zinc-100 rounded" />
      </div>
    </div>
  )
}
