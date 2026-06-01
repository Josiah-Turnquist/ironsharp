import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FREE_PERKS = [
  "You + 2 others included",
  "All 5 color themes",
  "Core devotional plans",
  "Read-aloud and voice memos",
];

const categoryLabels: Record<string, string> = {
  men: "Men's",
  women: "Women's",
  fathers: "Husbands & Fathers",
  mothers: "Wives & Mothers",
  family: "Family",
  marriage: "Marriage",
  youth: "Youth",
  "new-believer": "New Believer",
  general: "General",
};

interface Plan {
  id: string;
  title: string;
  description: string | null;
  total_days: number;
  category: string;
}

const OnboardingWelcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase
      .from("devotional_plans")
      .select("id, title, description, total_days, category")
      .order("category", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setPlans(data || []);
        setPlansLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Header */}
        <div className="px-6 pt-10 pb-6 text-center">
          <h2 className="font-serif text-4xl font-bold tracking-tight">
            Iron<span className="text-primary">Sharp</span>
          </h2>
          <p className="mt-3 font-serif text-lg text-foreground">
            Welcome to the community.
          </p>
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-left">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your free account includes
            </p>
            <ul className="space-y-2">
              {FREE_PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6">
          <h3 className="mb-1 font-serif text-xl font-bold">Available Plans</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Scroll through what's waiting for you.
          </p>

          {plansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-serif text-base text-muted-foreground">Plans are on the way.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-bold leading-snug">{plan.title}</p>
                      {plan.description && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {plan.total_days} Days
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {categoryLabels[plan.category] ?? plan.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky continue button */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Button
            onClick={() => navigate("/home", { replace: true })}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            Continue to IronSharp →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
