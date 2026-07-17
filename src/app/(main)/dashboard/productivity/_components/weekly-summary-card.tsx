import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function WeeklySummaryCard() {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Resume Readiness</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          Resume points only work well when project summaries, architecture notes, and recent handoffs are all in sync.
        </p>
        <div className="flex flex-col gap-2">
          <div className="font-medium">9 of 12 projects are ready to resume across agents</div>
          <Progress value={75} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
