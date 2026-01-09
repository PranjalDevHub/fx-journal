import Link from "next/link"
import { ReactNode } from "react"
import { BarChart3, NotebookPen, Clock } from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/trades", label: "Trades", icon: NotebookPen },
  { href: "/time", label: "Time", icon: Clock },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <div className="text-lg font-semibold leading-none">FX Journal</div>
            <div className="text-sm text-muted-foreground">Personal analytics</div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Offline-first. Your data stays on this device (for now).
          </div>
        </aside>

        <main className="rounded-xl border bg-card p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}