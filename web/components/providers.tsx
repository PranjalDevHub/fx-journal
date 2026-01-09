"use client";

import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { WorkspaceProvider, useWorkspace } from "@/components/workspace-provider";
import { syncWorkspace } from "@/lib/sync/sync";

function SyncRunner() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      try {
        await syncWorkspace(activeWorkspaceId);
      } catch (e) {
        console.warn("Sync error:", e);
      }
    };

    // sync when workspace changes / login changes
    void run();

    // sync when internet comes back
    const onOnline = () => void run();
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [user?.id, activeWorkspaceId]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <SyncRunner />
        {children}
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default Providers;