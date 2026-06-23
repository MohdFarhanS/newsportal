import { redirect } from "next/navigation"
import { Menu } from "lucide-react"
import { auth } from "@/lib/auth"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import DashboardNav from "@/components/dashboard/DashboardNav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-56px)]">
      {/* Mobile nav trigger — above content, not beside it */}
      <div className="md:hidden mb-4">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded">
              <Menu size={16} />
              Menu
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 pt-10">
            <div className="border-t border-zinc-200 mb-2" />
            <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic mb-1">
              NewsPortal
            </p>
            <div className="h-[2px] bg-red-600 mb-5" />
            <DashboardNav role={role} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-48 flex-shrink-0">
          <div className="border-t border-zinc-200 mb-2" />
          <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic mb-1">
            NewsPortal
          </p>
          <div className="h-[2px] bg-red-600 mb-5" />
          <DashboardNav role={role} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
