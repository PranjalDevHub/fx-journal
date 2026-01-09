import { db } from "@/lib/db";

function nowIso() {
  return new Date().toISOString();
}

export async function moveLocalDataToWorkspace(targetWorkspaceId: string) {
  if (!targetWorkspaceId || targetWorkspaceId === "local") return;

  const stamp = nowIso();

  // Move trades
  const localTrades = await db.trades.where("workspaceId").equals("local").toArray();
  if (localTrades.length) {
    await db.trades.bulkPut(
      localTrades.map((t) => ({
        ...t,
        workspaceId: targetWorkspaceId,
        updatedAt: stamp,
      }))
    );
  }

  // Move psychology snapshots
  const localPsych = await db.psychSnapshots.where("workspaceId").equals("local").toArray();
  if (localPsych.length) {
    await db.psychSnapshots.bulkPut(
      localPsych.map((p) => ({
        ...p,
        workspaceId: targetWorkspaceId,
        updatedAt: stamp,
      }))
    );
  }
}