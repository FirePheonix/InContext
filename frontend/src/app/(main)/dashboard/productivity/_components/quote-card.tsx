import { Quote } from "lucide-react";

export function QuoteCard() {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex items-start gap-4">
        <div className="grid size-8 shrink-0 place-items-center text-muted-foreground">
          <Quote className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xl leading-none tracking-tight">Context should survive the agent, not the session.</p>
          <p className="text-muted-foreground">
            Every handoff needs searchable transcripts, project memory, and verified architecture notes.
          </p>
        </div>
      </div>
    </section>
  );
}
