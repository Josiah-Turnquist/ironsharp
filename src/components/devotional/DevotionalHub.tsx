import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Flame, BookOpen, Plus } from "lucide-react";

/* ── colour tokens per plan type ── */
const typeColors: Record<string, string> = {
  community: "#89B4C9",
  partner: "#A89070",
  family: "#7FAF8A",
  group: "#B8A86A",
};

interface PlanCard {
  id: string;
  type: "community" | "partner" | "family" | "group";
  name: string;
  reference: string;
  day: number;
  totalDays: number;
  streak: number;
  tagline: string;
}

const mockPlans: PlanCard[] = [
  {
    id: "1",
    type: "community",
    name: "Community Plan",
    reference: "Proverbs 27",
    day: 14,
    totalDays: 30,
    streak: 14,
    tagline: "4.2K completed today",
  },
  {
    id: "2",
    type: "partner",
    name: "Marcus & Me",
    reference: "James 1",
    day: 5,
    totalDays: 7,
    streak: 5,
    tagline: "Marcus finished · your turn",
  },
  {
    id: "3",
    type: "family",
    name: "The Johnsons",
    reference: "Psalm 23",
    day: 3,
    totalDays: 14,
    streak: 3,
    tagline: "2 of 4 done today",
  },
  {
    id: "4",
    type: "group",
    name: "The Forge",
    reference: "Romans 8",
    day: 10,
    totalDays: 30,
    streak: 7,
    tagline: "3 of 5 done today",
  },
];

interface Props {
  onOpenPlan: (planId: string) => void;
}

const DevotionalHub = ({ onOpenPlan }: Props) => {
  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Your Daily Reading
      </p>
      <h1 className="mb-6 font-serif text-2xl font-bold">Devotionals</h1>

      {/* Plan cards */}
      <div className="space-y-4">
        {mockPlans.map((plan) => {
          const accent = typeColors[plan.type];
          const pct = Math.round((plan.day / plan.totalDays) * 100);

          return (
            <div
              key={plan.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              {/* Accent bar */}
              <div className="h-[3px] w-full" style={{ backgroundColor: accent }} />

              <div className="px-4 py-4">
                {/* Name + streak */}
                <div className="flex items-start justify-between">
                  <h2 className="font-serif text-lg font-bold leading-tight">
                    {plan.name}
                  </h2>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="h-3.5 w-3.5" />
                    <span className="font-semibold">{plan.streak}</span>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {plan.reference} · Day {plan.day}/{plan.totalDays}
                </p>

                {/* Progress bar */}
                <div className="mt-3">
                  <Progress value={pct} className="h-[2px]" />
                </div>

                {/* Tagline */}
                <p className="mt-2 text-xs italic text-muted-foreground">
                  {plan.tagline}
                </p>

                {/* Open button */}
                <Button
                  className="mt-3 w-full rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: accent }}
                  onClick={() => onOpenPlan(plan.id)}
                >
                  Open Today's Reading →
                </Button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default DevotionalHub;