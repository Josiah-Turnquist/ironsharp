import { useEffect, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StudyNote {
  verse_ref: string;
  note: string;
}

interface Props {
  planId: string;
  dayNumber: number;
  passageReference: string;
}

const StudyNotesDrawer = ({ planId, dayNumber, passageReference }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [source, setSource] = useState<string | null>(null);

  // Reset to closed whenever day changes
  useEffect(() => {
    setOpen(false);
  }, [planId, dayNumber]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("study_notes")
        .select("notes, source")
        .eq("plan_id", planId)
        .eq("day_number", dayNumber)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotes([]);
        setSource(null);
      } else {
        setNotes(Array.isArray(data.notes) ? (data.notes as StudyNote[]) : []);
        setSource(data.source ?? null);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [planId, dayNumber]);

  return (
    <div className="mb-6">
      {/* Toggle button — flush to an implicit passage card above */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between border border-border bg-[hsl(var(--card-deep))] px-4 py-3 transition-colors hover:bg-[hsl(var(--card-deep))]/80 ${
          open ? "rounded-none" : "rounded-b-xl"
        }`}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span
            className="font-serif text-[11px] uppercase text-muted-foreground"
            style={{ letterSpacing: "0.5px" }}
          >
            Open Study Notes
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground/70 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded panel */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-b-xl border border-t-0 border-border bg-[hsl(var(--card))]/60 px-4 py-4">
          <p
            className="mb-3 text-[9px] font-semibold uppercase text-muted-foreground/70"
            style={{ letterSpacing: "2px" }}
          >
            Study Notes · {passageReference}
          </p>

          {loading ? (
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted/40" />
            </div>
          ) : notes.length === 0 ? (
            <p className="font-serif text-sm italic text-muted-foreground/70">
              Study notes for this chapter are coming soon.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {notes.map((n, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0">
                  <p className="mb-1 text-[10px] font-bold text-accent">
                    {n.verse_ref}
                  </p>
                  <p
                    className="font-serif text-[12px] text-muted-foreground"
                    style={{ lineHeight: 1.7 }}
                  >
                    {n.note}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 border-t border-border/50 pt-3 text-[9px] italic text-muted-foreground/60">
            {source ? `Source: ${source}` : "Study notes — source TBD"} · For reference only
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudyNotesDrawer;