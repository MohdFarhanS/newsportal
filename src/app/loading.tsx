export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="animate-pulse h-[420px] rounded bg-zinc-100" />
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
        <div className="animate-pulse h-[600px] rounded bg-zinc-100" />
        <div className="animate-pulse h-[400px] rounded bg-zinc-100" />
      </div>
    </div>
  )
}
