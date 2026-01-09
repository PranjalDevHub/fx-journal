"use client"

import { WEEKDAYS_MON_FIRST } from "@/lib/time-buckets"
import type { HeatmapCell } from "@/lib/time-analytics"

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function cellStyle(value: number | null, maxAbs: number) {
  if (value === null) {
    return { background: "hsl(var(--muted))" }
  }

  const abs = Math.abs(value)
  const intensity = maxAbs <= 0 ? 0 : clamp01(abs / maxAbs)

  // green for positive, red for negative
  const hue = value >= 0 ? 142 : 0
  const sat = 70
  const light = 96 - intensity * 35 // stronger value => darker

  return { background: `hsl(${hue} ${sat}% ${light}%)` }
}

export function TimeHeatmap({ cells }: { cells: HeatmapCell[][] }) {
  // compute maxAbs from avgR values for coloring
  let maxAbs = 0
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = cells[d][h].avgR
      if (typeof v === "number") maxAbs = Math.max(maxAbs, Math.abs(v))
    }
  }
  if (maxAbs === 0) maxAbs = 1

  return (
    <div className="overflow-auto">
      <div className="min-w-[920px]">
        {/* header row */}
        <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 text-xs">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-muted-foreground">
              {h}
            </div>
          ))}
        </div>

        <div className="mt-2 grid gap-1">
          {WEEKDAYS_MON_FIRST.map((day, dIdx) => (
            <div
              key={day}
              className="grid grid-cols-[60px_repeat(24,1fr)] gap-1"
            >
              <div className="flex items-center text-xs text-muted-foreground">
                {day}
              </div>

              {Array.from({ length: 24 }, (_, h) => {
                const c = cells[dIdx][h]
                const v = c.avgR
                const title =
                  v === null
                    ? `${day} ${h}:00 UTC • n=${c.n} (need more trades)`
                    : `${day} ${h}:00 UTC • avg ${v}R • n=${c.n}`
                return (
                  <div
                    key={h}
                    title={title}
                    className="h-8 rounded-md border"
                    style={cellStyle(v, maxAbs)}
                  >
                    <div className="flex h-full items-center justify-center text-[10px] text-foreground/80">
                      {v === null ? "" : v}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Heatmap shows <span className="text-foreground font-medium">Avg R</span> by close time (UTC). Hover any cell to see sample size (n).
        </div>
      </div>
    </div>
  )
}