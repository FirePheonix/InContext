import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function WeeklySummaryCard() {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Handoff Coverage</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          Most active projects now have machine-readable summaries and architecture notes.
        </p>
        <div className="flex flex-col gap-2">
          <div className="font-medium">9 of 12 projects portable across agents</div>
          <Progress value={75} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
