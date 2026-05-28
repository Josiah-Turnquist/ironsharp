import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PersonalPlan {
  planId: string;
  title: string;
  chapter: string;
  theme: string | null;
  currentDay: number;
  totalDays: number;
}

interface Props {
  onOpenPlan: (planId: string) => void;
}

const DevotionalHub = ({ onOpenPlan }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [personal, setPersonal] = useState<PersonalPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: progress } = await supabase
        .from("user_plan_progress")
        .select("plan_id, current_day")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!progress) {
        setLoading(false);
        return;
      }
      const { data: plan } = await supabase
        .from("devotional_plans")
        .select("id, title, total_days")
        .eq("id", progress.plan_id)
        .single();
      const { data: day } = await supabase
        .from("devotional_days")
        .select("chapter, theme")
        .eq("plan_id", progress.plan_id)
        .eq("day_number", progress.current_day)
        .single();
      if (plan && day) {
        setPersonal({
          planId: plan.id,
          title: plan.title,
          chapter: day.chapter,
          theme: day.theme,
          currentDay: progress.current_day,
          totalDays: plan.total_days,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Your Daily Reading
      </p>
      <h1 className="mb-6 font-serif text-2xl font-bold">Devotionals</h1>

      {loading ? (
        <div className="mb-6 h-48 animate-pulse rounded-2xl bg-card" />
      ) : personal ? (
        <button
          onClick={() => onOpenPlan(personal.planId)}
          className="mb-6 block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="h-1 w-full bg-primary" />
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Your Personal Plan
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold leading-tight">
              {personal.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {personal.chapter} · Day {personal.currentDay} of {personal.totalDays}
            </p>
            {personal.theme && (
              <p className="mt-3 font-serif text-sm italic text-muted-foreground">
                {personal.theme}
              </p>
            )}
            <div className="mt-4">
              <Progress
                value={Math.round((personal.currentDay / personal.totalDays) * 100)}
                className="h-[3px]"
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" />
              Continue Reading →
            </div>
          </div>
        </button>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-serif text-base font-semibold">No active plan yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a devotional to make it yours.
          </p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/plans")}>
            Browse Plans
          </Button>
        </div>
      )}

      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Shared Plans
      </p>
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <p className="font-serif text-base font-semibold">No active shared plans</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Join a group or pair with a discipler to start a shared plan.
        </p>
        <Button
          variant="outline"
          className="mt-4 rounded-xl"
          onClick={() => navigate("/groups")}
        >
          <Users className="mr-2 h-4 w-4" />
          Find a Group →
        </Button>
      </div>
    </div>
  );
};

export default DevotionalHub;