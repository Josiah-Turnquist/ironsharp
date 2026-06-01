import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Users, Plus, Check, AlertTriangle, Loader2, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  "one-on-one": "One-on-One",
  family: "Family",
  "small-group": "Small Group",
  "large-group": "Large Group",
};

interface GroupOption {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  currentPlanId: string | null;
}

interface Props {
  planId: string;
  planTitle: string;
  open: boolean;
  onClose: () => void;
}

const AssignPlanModal = ({ planId, planTitle, open, onClose }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [planType, setPlanType] = useState<"personal" | "shared" | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [activePersonalPlan, setActivePersonalPlan] = useState<string | null>(null);
  const [activeGroupCount, setActiveGroupCount] = useState(0);

  useEffect(() => {
    if (!open || !user) return;
    setStep(1);
    setPlanType(null);
    setSelectedGroup(null);
    setLoading(true);
    load();
  }, [open, user]);

  const load = async () => {
    if (!user) return;

    const { data: gms } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    const groupIds = (gms || []).map((g) => g.group_id);

    if (groupIds.length) {
      const [{ data: gs }, { data: allMembers }] = await Promise.all([
        supabase.from("groups").select("id, name, group_type, current_plan_id").in("id", groupIds),
        supabase.from("group_members").select("group_id").in("group_id", groupIds),
      ]);

      const counts: Record<string, number> = {};
      (allMembers || []).forEach((m) => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });

      setGroups((gs || []).map((g) => ({
        id: g.id,
        name: g.name,
        type: g.group_type,
        memberCount: counts[g.id] ?? 1,
        currentPlanId: g.current_plan_id,
      })));
      setActiveGroupCount((gs || []).filter((g) => g.current_plan_id !== null).length);
    } else {
      setGroups([]);
      setActiveGroupCount(0);
    }

    const { data: progress } = await supabase
      .from("user_plan_progress")
      .select("plan_id")
      .eq("user_id", user.id)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progress) {
      const { data: planData } = await supabase
        .from("devotional_plans")
        .select("title")
        .eq("id", progress.plan_id)
        .single();
      setActivePersonalPlan(planData?.title ?? "another plan");
    } else {
      setActivePersonalPlan(null);
    }

    setLoading(false);
  };

  const handleStart = async () => {
    if (!user) return;

    if (planType === "personal") {
      setStarting(true);
      const { error } = await supabase
        .from("user_plan_progress")
        .upsert(
          { user_id: user.id, plan_id: planId, current_day: 1, started_at: new Date().toISOString() },
          { onConflict: "user_id,plan_id" }
        );
      setStarting(false);
      if (error) {
        toast({ title: "Couldn't start plan", description: error.message, variant: "destructive" });
        return;
      }
      onClose();
      navigate(`/devotional?plan=${planId}`);
      return;
    }

    if (planType === "shared") {
      if (!selectedGroup || selectedGroup === "new-group") {
        onClose();
        navigate("/groups");
        return;
      }
      if (activeGroupCount >= 3) {
        toast({ title: "You are in 3 active devotionals. Finish one before starting another." });
        return;
      }
      setStarting(true);
      const [{ error: gErr }, { error: pErr }] = await Promise.all([
        supabase.from("groups").update({ current_plan_id: planId, current_day: 1 }).eq("id", selectedGroup),
        supabase.from("user_plan_progress").upsert(
          { user_id: user.id, plan_id: planId, current_day: 1, started_at: new Date().toISOString() },
          { onConflict: "user_id,plan_id" }
        ),
      ]);
      setStarting(false);
      if (gErr || pErr) {
        toast({ title: "Couldn't start plan", description: (gErr || pErr)?.message, variant: "destructive" });
        return;
      }
      onClose();
      navigate(`/devotional?plan=${planId}`);
    }
  };

  const showReplaceWarning = planType === "personal" && !!activePersonalPlan;
  const selectedGroupAtLimit = planType === "shared" && selectedGroup && selectedGroup !== "new-group" && activeGroupCount >= 3;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">

        {/* Step 1 — Personal or Shared */}
        {step === 1 && (
          <>
            <div className="px-5 pt-5 pb-3">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl font-bold">
                  Is this a personal or shared devotional?
                </DialogTitle>
              </DialogHeader>
              <p className="mt-1 text-sm italic text-muted-foreground">{planTitle}</p>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Personal */}
                  <button
                    onClick={() => setPlanType("personal")}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                      planType === "personal" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Personal</p>
                      <p className="text-sm text-muted-foreground">Just for me</p>
                    </div>
                    {planType === "personal" && <Check className="h-5 w-5 text-primary shrink-0" />}
                  </button>

                  {showReplaceWarning && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <strong>{activePersonalPlan}</strong> is your current personal plan. Starting this will replace it.
                      </span>
                    </div>
                  )}

                  {/* Shared */}
                  <button
                    onClick={() => setPlanType("shared")}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                      planType === "shared" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Shared with a Group</p>
                      <p className="text-sm text-muted-foreground">Alongside a group</p>
                    </div>
                    {planType === "shared" && <Check className="h-5 w-5 text-primary shrink-0" />}
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-border px-5 py-4">
              <Button
                onClick={() => {
                  if (!planType) return;
                  if (planType === "personal") handleStart();
                  else setStep(2);
                }}
                disabled={!planType || starting || loading}
                className="h-12 w-full rounded-xl text-base font-semibold"
              >
                {starting ? "Starting…" : planType === "personal" ? (showReplaceWarning ? "Replace & Start" : "Start Plan") : "Next →"}
              </Button>
            </div>
          </>
        )}

        {/* Step 2 — Group picker */}
        {step === 2 && (
          <>
            <div className="px-5 pt-5 pb-3">
              <button
                onClick={() => { setStep(1); setSelectedGroup(null); }}
                className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl font-bold">Which group?</DialogTitle>
              </DialogHeader>
              <p className="mt-1 text-sm italic text-muted-foreground">{planTitle}</p>
            </div>

            <div className="px-5 pb-5 space-y-2 max-h-[50vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {groups.map((group) => {
                    const isSelected = selectedGroup === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroup(group.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                          isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabels[group.type] ?? group.type} · {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}

                  {selectedGroupAtLimit && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>You are in 3 active devotionals. Finish one before starting another.</span>
                    </div>
                  )}

                  {/* Start a new group */}
                  <button
                    onClick={() => setSelectedGroup("new-group")}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition-all ${
                      selectedGroup === "new-group" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Start a New Group</p>
                      <p className="text-xs text-muted-foreground">Create a group around this plan</p>
                    </div>
                    {selectedGroup === "new-group" && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-border px-5 py-4">
              <Button
                onClick={handleStart}
                disabled={!selectedGroup || starting || !!selectedGroupAtLimit}
                className="h-12 w-full rounded-xl text-base font-semibold"
              >
                {starting ? "Starting…" : selectedGroup === "new-group" ? "Go to Groups →" : "Start Plan"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignPlanModal;
