"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import { moveLocalDataToWorkspace } from "@/lib/sync/move-local";
import { syncWorkspace } from "@/lib/sync/sync";

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        "block rounded-md px-3 py-2 text-sm",
        active ? "bg-muted font-medium" : "hover:bg-muted",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { user, signOut } = useAuth();
  const {
    activeWorkspaceId,
    setActiveWorkspaceId,
    workspaces,
    loading,
    error,
    refresh,
  } = useWorkspace();

  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeName = useMemo(() => {
    if (activeWorkspaceId === "local") return "Local (offline)";
    return workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? "Workspace";
  }, [activeWorkspaceId, workspaces]);

  async function doSyncNow() {
    if (!user) return;
    if (activeWorkspaceId === "local") {
      setSyncMsg("Local mode: nothing to sync.");
      return;
    }

    setBusy(true);
    setSyncMsg(null);
    try {
      await syncWorkspace(activeWorkspaceId);
      setSyncMsg("Synced successfully.");
    } catch (e: any) {
      setSyncMsg(`Sync failed: ${e?.message ?? "unknown error"}`);
      console.warn(e);
    } finally {
      setBusy(false);
    }
  }

  async function moveLocalToHere() {
    if (!user) return;
    if (activeWorkspaceId === "local") return;

    setBusy(true);
    setSyncMsg(null);
    try {
      await moveLocalDataToWorkspace(activeWorkspaceId);
      await syncWorkspace(activeWorkspaceId);
      setSyncMsg("Moved local data and synced.");
    } catch (e: any) {
      setSyncMsg(`Move failed: ${e?.message ?? "unknown error"}`);
      console.warn(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">FX Journal</div>
        <div className="text-xs text-muted-foreground">Personal analytics</div>
      </div>

      <div className="space-y-2">
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

        {syncMsg ? (
          <div className="rounded-md border bg-muted p-2 text-xs">{syncMsg}</div>
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

            <Button
              className="w-full"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh workspaces
            </Button>

            <Button
              className="w-full"
              size="sm"
              disabled={busy || activeWorkspaceId === "local"}
              onClick={() => void doSyncNow()}
            >
              Sync now
            </Button>

            <Button
              className="w-full"
              variant="secondary"
              size="sm"
              disabled={busy || activeWorkspaceId === "local"}
              onClick={() => void moveLocalToHere()}
            >
              Move local trades → this workspace
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full" size="sm" onClick={onNavigate}>
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>

      <nav className="space-y-1">
        <NavLink href="/" label="Dashboard" onNavigate={onNavigate} />
        <NavLink href="/trades" label="Trades" onNavigate={onNavigate} />
        <NavLink href="/time" label="Time" onNavigate={onNavigate} />
        <NavLink href="/psychology" label="Psychology" onNavigate={onNavigate} />
      </nav>

      <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        Offline-first: data is stored locally. Sync sends data to Supabase for cloud workspaces.
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b bg-card md:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">FX Journal</div>
            <div className="truncate text-xs text-muted-foreground">Mobile</div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
            Menu
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[320px] max-w-[85vw] overflow-y-auto border-r bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Menu</div>
              <Button variant="outline" size="sm" onClick={() => setMobileOpen(false)}>
                Close
              </Button>
            </div>

            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Desktop layout */}
      <div className="mx-auto max-w-[1200px] p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr] md:gap-6">
          <aside className="hidden rounded-xl border bg-card p-4 md:block">
            <SidebarContent />
          </aside>

          <main className="rounded-xl border bg-card p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppShell;