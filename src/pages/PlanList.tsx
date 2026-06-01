import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, BookOpen } from "lucide-react";
import AssignPlanModal from "@/components/AssignPlanModal";

interface Plan {
  id: string;
  title: string;
  description: string | null;
  total_days: number;
  category: string;
}

const categoryLabels: Record<string, string> = {
  men: "Men's Devotional",
  women: "Women's Devotional",
  fathers: "Husbands & Fathers",
  mothers: "Wives & Mothers",
  family: "Family Devotional",
  marriage: "Marriage",
  youth: "Youth",
  "new-believer": "New Believer",
  general: "General",
};

const PlanList = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [assignPlan, setAssignPlan] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!category) return;
      const { data } = await supabase
        .from("devotional_plans")
        .select("id, title, description, total_days, category")
        .eq("category", category)
        .order("created_at", { ascending: true });
      setPlans(data || []);

      if (user && data && data.length > 0) {
        const planIds = data.map((p) => p.id);
        const { data: progress } = await supabase
          .from("user_plan_progress")
          .select("plan_id, current_day, completed_at")
          .eq("user_id", user.id)
          .in("plan_id", planIds);
        if (progress) {
          const map: Record<string, number> = {};
          progress.forEach((p) => {
            map[p.plan_id] = p.completed_at ? -1 : p.current_day;
          });
          setProgressMap(map);
        }
      }
      setLoading(false);
    };
    load();
  }, [category, user]);

  const label = categoryLabels[category || ""] || category || "Plans";

  const getStatusLabel = (planId: string) => {
    const day = progressMap[planId];
    if (day === undefined) return "Start Plan";
    if (day === -1) return "Completed ✓";
    return `Continue · Day ${day}`;
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-4 py-6">
        <button
          onClick={() => navigate("/plans")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Plans
        </button>

        <h1 className="mb-1 font-serif text-2xl font-bold">{label}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {plans.length} {plans.length === 1 ? "plan" : "plans"} available
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-serif text-lg font-semibold">Coming Soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New plans for this category are on the way.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  const status = getStatusLabel(plan.id);
                  if (status === "Start Plan") {
                    setAssignPlan({ id: plan.id, title: plan.title });
                  } else {
                    navigate(`/devotional?plan=${plan.id}`);
                  }
                }}
                className="group w-full rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-bold leading-tight">
                      {plan.title}
                    </h3>
                    {plan.description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {plan.total_days} Days
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {getStatusLabel(plan.id)}
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="mt-1 h-4 w-4 rotate-180 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {assignPlan && (
        <AssignPlanModal
          planId={assignPlan.id}
          planTitle={assignPlan.title}
          open={!!assignPlan}
          onClose={() => setAssignPlan(null)}
        />
      )}
    </AppLayout>
  );
};

export default PlanList;