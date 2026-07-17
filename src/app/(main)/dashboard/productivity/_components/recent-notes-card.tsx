import { BookOpen, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentMemoryNote } from "@/lib/productivity";

export function RecentNotesCard({ notes }: { notes: RecentMemoryNote[] }) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Recent Context Updates</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notes.map((note) => {
          const Icon = note.type === "document" ? BookOpen : FileText;

          return (
            <div key={note.title} className="flex items-start gap-4">
              <Icon className="size-5 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate font-medium text-sm leading-none">{note.title}</div>
                <div className="text-muted-foreground text-xs">{note.dateLabel}</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
