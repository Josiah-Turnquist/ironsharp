import AppLayout from "@/components/AppLayout";
import { ChevronLeft, Shield, Lock, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface NoteRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  note: string;
  created_at: string;
}
interface ProfileLite {
  user_id: string;
  display_name: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const DisciplerNotes = () => {
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [discipler, setDiscipler] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // Find my discipler (or my disciple — show whoever you have a relationship with)
    const { data: rel } = await supabase
      .from("disciple_relationships")
      .select("discipler_id, disciple_id")
      .or(`discipler_id.eq.${user.id},disciple_id.eq.${user.id}`)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    let partnerId: string | null = null;
    if (rel) partnerId = rel.discipler_id === user.id ? rel.disciple_id : rel.discipler_id;

    if (partnerId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("user_id", partnerId)
        .maybeSingle();
      if (p) setDiscipler(p);
    }

    const { data: noteRows } = await supabase
      .from("discipler_notes")
      .select("id, from_user_id, to_user_id, note, created_at")
      .order("created_at", { ascending: true });
    setNotes(noteRows || []);

    const ids = Array.from(new Set([user.id, ...(noteRows || []).flatMap(n => [n.from_user_id, n.to_user_id])]));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const send = async () => {
    if (!user || !discipler || !newNote.trim()) return;
    setSending(true);
    const { error } = await supabase.from("discipler_notes").insert({
      from_user_id: user.id,
      to_user_id: discipler.user_id,
      note: newNote.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Couldn't send", description: error.message, variant: "destructive" });
      return;
    }
    setNewNote("");
    toast({ title: "Note sent" });
    load();
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate("/home")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-serif text-2xl font-bold">Discipler Notes</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>{discipler ? `Private conversation with ${discipler.display_name}` : "Find a discipler to start a thread"}</span>
          </div>
        </div>

        {/* Notes thread */}
        {discipler ? (
          <div className="mb-6 space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && notes.length === 0 && (
              <p className="text-sm italic text-muted-foreground">No notes yet — send the first one below.</p>
            )}
            {notes.map(note => {
              const mine = note.from_user_id === user?.id;
              const fromName = profiles[note.from_user_id]?.display_name || (mine ? displayName : "Unknown");
              return (
                <div
                  key={note.id}
                  className={`rounded-xl border p-4 ${
                    mine
                      ? "border-primary/30 bg-primary/5 ml-6"
                      : "border-border bg-card mr-6"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {fromName[0]}
                      </div>
                      <div>
                        <span className="text-sm font-semibold">{fromName.split(" ")[0]}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{mine ? "You" : "Discipler"}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{note.note}</p>
                </div>
              );
            })}

            {/* Reply */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reply to {discipler.display_name.split(" ")[0]}
              </p>
              <Textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Write a private note..."
                className="mb-3 min-h-[80px] rounded-xl"
                maxLength={2000}
              />
              <Button onClick={send} className="h-10 w-full rounded-xl" disabled={!newNote.trim() || sending}>
                <Send className="mr-2 h-4 w-4" /> {sending ? "Sending…" : "Send Note"}
              </Button>
            </div>
          </div>
        ) : (
          !loading && (
            <p className="text-[13px] italic text-muted-foreground/70">No Discipler Notes</p>
          )
        )}
      </div>
    </AppLayout>
  );
};

export default DisciplerNotes;