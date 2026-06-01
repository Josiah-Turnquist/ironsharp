import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ORDER_KEY = "ironsharp.shared_plans_order";

const typeLabels: Record<string, string> = {
  "one-on-one": "One-on-One",
  family: "Family",
  "small-group": "Small Group",
  "large-group": "Large Group",
};
const typeColors: Record<string, string> = {
  "one-on-one": "#89B4C9",
  family: "#7FAF8A",
  "small-group": "#C49A78",
  "large-group": "#9B8EC4",
  community: "#7A9EAF",
};

interface PersonalPlan {
  planId: string;
  title: string;
  chapter: string;
  theme: string | null;
  currentDay: number;
  totalDays: number;
}

interface SharedPlan {
  groupId: string;
  groupName: string;
  groupType: string;
  planId: string;
  planTitle: string;
  chapter: string;
  currentDay: number;
  totalDays: number;
  memberCount: number;
  doneToday: number;
}

interface Props {
  onOpenPlan: (planId: string) => void;
}

const DevotionalHub = ({ onOpenPlan }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [personal, setPersonal] = useState<PersonalPlan | null>(null);
  const [shared, setShared] = useState<SharedPlan[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const persistOrder = (next: string[]) => {
    setOrder(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch {}
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    persistOrder(arrayMove(order, from, to));
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    load();
  }, [user]);

  const load = async () => {
    if (!user) return;

    // Load user's active progress + group memberships in parallel
    const [progressResult, gmsResult] = await Promise.all([
      supabase
        .from("user_plan_progress")
        .select("plan_id, current_day")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("started_at", { ascending: false }),
      supabase.from("group_members").select("group_id").eq("user_id", user.id),
    ]);

    const allProgress = progressResult.data || [];
    const groupIds = (gmsResult.data || []).map((g) => g.group_id);

    let groupPlanIds: string[] = [];

    // ── Shared plans ──────────────────────────────────────────────
    if (groupIds.length) {
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, group_type, current_plan_id, current_day")
        .in("id", groupIds)
        .not("current_plan_id", "is", null);

      if (groups && groups.length) {
        groupPlanIds = groups.map((g) => g.current_plan_id as string);

        const [{ data: plans }, { data: days }, { data: allMembers }, { data: subs }] = await Promise.all([
          supabase.from("devotional_plans").select("id, title, total_days").in("id", groupPlanIds),
          supabase.from("devotional_days").select("plan_id, day_number, chapter").in("plan_id", groupPlanIds),
          supabase.from("group_members").select("group_id, user_id").in("group_id", groupIds),
          supabase.from("devotional_submissions").select("user_id, plan_id, day_number, submitted_at").in("plan_id", groupPlanIds),
        ]);

        const planMap = new Map((plans || []).map((p) => [p.id, p]));
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const submittedToday = new Set(
          (subs || [])
            .filter((s) => new Date(s.submitted_at) >= today)
            .map((s) => `${s.user_id}|${s.plan_id}|${s.day_number}`)
        );

        const built: SharedPlan[] = groups.map((g) => {
          const plan = planMap.get(g.current_plan_id as string);
          const day = (days || []).find((d) => d.plan_id === g.current_plan_id && d.day_number === g.current_day);
          const members = (allMembers || []).filter((m) => m.group_id === g.id);
          const doneToday = members.filter((m) =>
            submittedToday.has(`${m.user_id}|${g.current_plan_id}|${g.current_day}`)
          ).length;
          return {
            groupId: g.id,
            groupName: g.name,
            groupType: g.group_type,
            planId: g.current_plan_id as string,
            planTitle: plan?.title ?? "Unknown plan",
            chapter: day?.chapter ?? "",
            currentDay: g.current_day,
            totalDays: plan?.total_days ?? 0,
            memberCount: members.length,
            doneToday,
          };
        });

        setShared(built);

        // Restore saved order, merging in any new groups
        try {
          const saved = localStorage.getItem(ORDER_KEY);
          const parsed = saved ? (JSON.parse(saved) as string[]) : [];
          const ids = built.map((s) => s.groupId);
          const merged = [
            ...parsed.filter((id) => ids.includes(id)),
            ...ids.filter((id) => !parsed.includes(id)),
          ];
          setOrder(merged);
        } catch {
          setOrder(built.map((s) => s.groupId));
        }
      }
    }

    // ── Personal plan (exclude plans already assigned to groups) ──
    const personalProg = allProgress.find((p) => !groupPlanIds.includes(p.plan_id));

    if (personalProg) {
      const [{ data: plan }, { data: day }] = await Promise.all([
        supabase.from("devotional_plans").select("id, title, total_days").eq("id", personalProg.plan_id).single(),
        supabase.from("devotional_days").select("chapter, theme").eq("plan_id", personalProg.plan_id).eq("day_number", personalProg.current_day).single(),
      ]);
      if (plan && day) {
        setPersonal({
          planId: plan.id,
          title: plan.title,
          chapter: day.chapter,
          theme: day.theme,
          currentDay: personalProg.current_day,
          totalDays: plan.total_days,
        });
      }
    }

    setLoading(false);
  };

  const orderedShared = order
    .map((id) => shared.find((s) => s.groupId === id))
    .filter(Boolean) as SharedPlan[];

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Your Daily Reading
      </p>
      <h1 className="mb-6 font-serif text-2xl font-bold">Devotionals</h1>

      {/* ── Personal plan ── */}
      {loading ? (
        <div className="mb-6 h-40 animate-pulse rounded-2xl bg-card" />
      ) : personal ? (
        <button
          onClick={() => onOpenPlan(personal.planId)}
          className="mb-6 block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="h-1 w-full bg-primary" />
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Your Plan
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold leading-tight">{personal.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {personal.chapter} · Day {personal.currentDay} of {personal.totalDays}
            </p>
            {personal.theme && (
              <p className="mt-3 font-serif text-sm italic text-muted-foreground">{personal.theme}</p>
            )}
            <div className="mt-4">
              <Progress value={Math.round((personal.currentDay / personal.totalDays) * 100)} className="h-[3px]" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" />
              Continue Reading →
            </div>
          </div>
        </button>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-serif text-base font-semibold">No personal plan yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Choose a devotional to make it yours.</p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/plans")}>Browse Plans</Button>
        </div>
      )}

      {/* ── Shared plans ── */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Shared Plans
        </p>
        {orderedShared.length > 1 && (
          <p className="text-[10px] text-muted-foreground/60">Drag to reorder</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />)}
        </div>
      ) : orderedShared.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-serif text-base font-semibold">No shared plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign a plan to a group to see it here.
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/groups")}>
            <Users className="mr-2 h-4 w-4" />
            Create or Find a Group →
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {orderedShared.map((s) => (
                <SortableSharedPlanCard
                  key={s.groupId}
                  s={s}
                  onOpenPlan={onOpenPlan}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default DevotionalHub;

// ── Sortable card ─────────────────────────────────────────────────

interface CardProps {
  s: SharedPlan;
  onOpenPlan: (planId: string) => void;
}

const SortableSharedPlanCard = ({ s, onOpenPlan }: CardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.groupId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const accent = typeColors[s.groupType] ?? "#A89070";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow ${isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md"}`}
    >
      <div className="h-1 w-full" style={{ background: accent }} />
      <div className="flex items-stretch">
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag to reorder"
          className="touch-none cursor-grab px-3 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Card content */}
        <div
          className="flex-1 cursor-pointer py-4 pr-4"
          onClick={() => onOpenPlan(s.planId)}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
              {s.groupName} · {typeLabels[s.groupType] ?? s.groupType}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {s.doneToday}/{s.memberCount} done today
            </p>
          </div>
          <h3 className="mt-1 font-serif text-base font-bold leading-snug">{s.planTitle}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {s.chapter} · Day {s.currentDay} of {s.totalDays}
          </p>
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round((s.currentDay / s.totalDays) * 100)}%`, backgroundColor: accent }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}>
            <BookOpen className="h-4 w-4" />
            Continue Reading →
          </div>
        </div>
      </div>
    </div>
  );
};
