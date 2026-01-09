"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { db } from "@/lib/db";
import { useAuth } from "@/components/auth-provider";

export type WorkspaceRole = "owner" | "editor" | "viewer";
export type WorkspaceSummary = { id: string; name: string; role: WorkspaceRole };

type WorkspaceState = {
  activeWorkspaceId: string; // "local" or uuid
  setActiveWorkspaceId: (id: string) => Promise<void>;
  workspaces: WorkspaceSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ensurePersonalWorkspace: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>("local");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function setActiveWorkspaceId(id: string) {
    setActiveWorkspaceIdState(id);
    await db.meta.put({ key: "activeWorkspaceId", value: id });
  }

  async function refresh() {
    setError(null);

    // Guest mode
    if (!user) {
      setWorkspaces([]);
      const saved = await db.meta.get("activeWorkspaceId");
      setActiveWorkspaceIdState(saved?.value ?? "local");
      setLoading(false);
      return;
    }

    setLoading(true);

    // memberships for this user
    const { data: memberships, error: mErr } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id);

    if (mErr) {
      console.warn(mErr);
      setError(`Failed to load memberships: ${mErr.message}`);
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const ids = (memberships ?? []).map((m) => m.workspace_id).filter(Boolean);

    if (ids.length === 0) {
      setWorkspaces([]);
      const saved = await db.meta.get("activeWorkspaceId");
      setActiveWorkspaceIdState(saved?.value ?? "local");
      setLoading(false);
      return;
    }

    // workspace names
    const { data: wsRows, error: wErr } = await supabase
      .from("workspaces")
      .select("id, name")
      .in("id", ids);

    if (wErr) {
      console.warn(wErr);
      setError(`Failed to load workspaces: ${wErr.message}`);
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const roleById = new Map<string, WorkspaceRole>();
    for (const m of memberships ?? []) {
      roleById.set(m.workspace_id, m.role as WorkspaceRole);
    }

    const ws: WorkspaceSummary[] = (wsRows ?? []).map((w) => ({
      id: w.id as string,
      name: (w.name as string) ?? "Workspace",
      role: roleById.get(w.id as string) ?? "viewer",
    }));

    setWorkspaces(ws);

    // pick active workspace
    const saved = await db.meta.get("activeWorkspaceId");
    const savedId = saved?.value ?? "local";
    const allowed = savedId === "local" || ws.some((x) => x.id === savedId);
    const nextActive = allowed ? savedId : ws[0].id;

    setActiveWorkspaceIdState(nextActive);
    await db.meta.put({ key: "activeWorkspaceId", value: nextActive });

    setLoading(false);
  }

  async function ensurePersonalWorkspace() {
    setError(null);
    if (!user) return;

    // Always call RPC — it is safe to run multiple times now
    const { data: wid, error: rpcErr } = await supabase.rpc("create_personal_workspace", {
      ws_name: "My Journal",
    });

    if (rpcErr) {
      console.warn(rpcErr);
      setError(`Failed to create workspace: ${rpcErr.message}`);
      return;
    }

    await refresh();

    // Switch to cloud workspace automatically
    if (typeof wid === "string" && wid) {
      await setActiveWorkspaceId(wid);
    }
  }

  useEffect(() => {
    (async () => {
      await refresh();
      if (user) {
        await ensurePersonalWorkspace();
        await refresh();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<WorkspaceState>(
    () => ({
      activeWorkspaceId,
      setActiveWorkspaceId,
      workspaces,
      loading,
      error,
      refresh,
      ensurePersonalWorkspace,
    }),
    [activeWorkspaceId, workspaces, loading, error]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}