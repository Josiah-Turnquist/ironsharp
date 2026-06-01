import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Flame, BookOpen, Globe, Sun, Headphones } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActiveDevotional {
  planTitle: string;
  chapter: string;
  theme: string | null;
  currentDay: number;
  totalDays: number;
  planId: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { displayName, user } = useAuth();
  const [activeDevotional, setActiveDevotional] = useState<ActiveDevotional | null>(null);
  const [streak, setStreak] = useState(0);
  const [profileName, setProfileName] = useState("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = (profileName || displayName).split(" ")[0];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("streak_count, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setStreak(profile.streak_count ?? 0);
        if (profile.display_name) setProfileName(profile.display_name);
      }

      // Check for a pinned home screen plan; fall back to most recent active
      const pinnedId = (() => { try { return localStorage.getItem("ironsharp.headline_plan_id"); } catch { return null; } })();

      let progress: { plan_id: string; current_day: number } | null = null;

      if (pinnedId) {
        const { data: pinned } = await supabase
          .from("user_plan_progress")
          .select("plan_id, current_day")
          .eq("user_id", user.id)
          .eq("plan_id", pinnedId)
          .is("completed_at", null)
          .maybeSingle();
        progress = pinned ?? null;
      }

      if (!progress) {
        const { data: recent } = await supabase
          .from("user_plan_progress")
          .select("plan_id, current_day")
          .eq("user_id", user.id)
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        progress = recent ?? null;
      }

      if (!progress) return;

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
        setActiveDevotional({
          planTitle: plan.title,
          chapter: day.chapter,
          theme: day.theme,
          currentDay: progress.current_day,
          totalDays: plan.total_days,
          planId: plan.id,
        });
      }
    };
    load();
  }, [user]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">{greeting}, {firstName}</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{streak} day streak</span>
          </div>
        </div>

        {/* Community & Podcast */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/community")}
            className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Soon</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Community</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">— · Day — · — done</p>
            </div>
          </button>
          <button
            onClick={() => toast({ title: "Podcast coming soon" })}
            className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Headphones className="h-4 w-4 text-primary" />
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Soon</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Podcast</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Ep. — · — min</p>
            </div>
          </button>
        </div>

        {/* Personal Devotional — Main Highlight */}
        <button
          onClick={() => navigate(activeDevotional ? `/devotional?plan=${activeDevotional.planId}` : "/devotional")}
          className="mb-6 w-full rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="mb-3 flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Time with God</h2>
          </div>
          <p className="mb-1 text-xs text-muted-foreground">
            {activeDevotional ? `${activeDevotional.planTitle} · Day ${activeDevotional.currentDay} of ${activeDevotional.totalDays}` : "Start a plan to begin"}
          </p>
          <h3 className="mb-2 font-serif text-xl font-bold">
            {activeDevotional?.chapter || "Choose a Plan"}
          </h3>
          <p className="mb-3 font-serif text-sm italic text-muted-foreground leading-relaxed">
            {activeDevotional?.theme || "Head to Plans to pick your first devotional and start your journey."}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Continue Reading →</span>
          </div>
        </button>

        {/* Daily Quote */}
        <div className="rounded-xl bg-card-deep p-4 text-center">
          <p className="font-serif text-sm italic text-muted-foreground">
            "As iron sharpens iron, so one person sharpens another."
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Proverbs 27:17</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;