"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useAuth } from "@/components/auth-provider";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "block rounded-md px-3 py-2 text-sm",
        active ? "bg-muted font-medium" : "hover:bg-muted",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const {
    activeWorkspaceId,
    setActiveWorkspaceId,
    workspaces,
    loading,
    error,
    ensurePersonalWorkspace,
    refresh,
  } = useWorkspace();

  const activeName =
    activeWorkspaceId === "local"
      ? "Local (offline)"
      : workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? "Workspace";

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[280px_1fr] gap-6 p-6">
        <aside className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <div className="text-lg font-semibold">FX Journal</div>
            <div className="text-xs text-muted-foreground">Personal analytics</div>
          </div>

          <div className="mb-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Workspace</div>

            <div className="text-sm font-medium">{activeName}</div>

            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={activeWorkspaceId}
              onChange={(e) => void setActiveWorkspaceId(e.target.value)}
              disabled={loading}
            >
              <option value="local">Local (offline)</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div className="text-xs text-muted-foreground">
              {user
                ? "Cloud workspaces sync across devices."
                : "Not logged in. You are using local-only mode."}
            </div>

            {user ? (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  <Button variant="outline" size="sm" onClick={() => void signOut()}>
                    Logout
                  </Button>
                </div>

                {workspaces.length === 0 ? (
                  <Button className="w-full" size="sm" onClick={() => void ensurePersonalWorkspace()}>
                    Create My Journal (cloud)
                  </Button>
                ) : null}

                <Button className="w-full" variant="outline" size="sm" onClick={() => void refresh()}>
                  Refresh workspaces
                </Button>
              </div>
            ) : (
              <Button asChild className="w-full" size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>

          <nav className="space-y-1">
            <NavLink href="/" label="Dashboard" />
            <NavLink href="/trades" label="Trades" />
            <NavLink href="/time" label="Time" />
            <NavLink href="/psychology" label="Psychology" />
          </nav>

          <div className="mt-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Offline-first: your data is stored locally. Cloud sync will be enabled after login + sync
            setup.
          </div>
        </aside>

        <main className="rounded-xl border bg-card p-6">{children}</main>
      </div>
    </div>
  );
}

// Export BOTH named + default to prevent import mistakes
export default AppShell;