"use client"

import type { Insight, InsightSeverity } from "@/lib/behavior-insights"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

function badgeFor(sev: InsightSeverity) {
  if (sev === "warn") return <Badge variant="destructive">Warning</Badge>
  if (sev === "good") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Good</Badge>
  return <Badge variant="secondary">Info</Badge>
}

export function WeeklyReview({ insights, title }: { insights: Insight[]; title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title ?? "Weekly review"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((x, idx) => (
          <div key={x.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{x.title}</div>
              {badgeFor(x.severity)}
            </div>
            <div className="text-sm text-muted-foreground">{x.evidence}</div>
            <div className="text-sm">{x.suggestion}</div>

            {idx !== insights.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}