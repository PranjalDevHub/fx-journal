import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TradesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trades</h1>
          <p className="text-sm text-muted-foreground">
            Log trades and review them (we’ll add local database next).
          </p>
        </div>
        <Button>Add trade</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trade list</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No trades yet.
        </CardContent>
      </Card>
    </div>
  )
}