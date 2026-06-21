interface SectionHeaderProps {
  title: string
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="border-l-4 border-red-600 pl-3 mb-6">
      <h2 className="text-lg font-bold uppercase tracking-wide text-[#18181B]">{title}</h2>
    </div>
  )
}
