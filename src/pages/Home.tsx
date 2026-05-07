import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Flame, BookOpen, Globe, Sun, Headphones } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const firstName = displayName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">{greeting}, {firstName}</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">5 day streak</span>
          </div>
        </div>

        {/* Personal Devotional — Main Highlight */}
        <button
          onClick={() => navigate("/devotional")}
          className="mb-6 w-full rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="mb-3 flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Time with God</h2>
          </div>
          <h3 className="mb-2 font-serif text-xl font-bold">Psalm 46</h3>
          <p className="mb-3 font-serif text-sm italic text-muted-foreground leading-relaxed">
            "God is our refuge and strength, a very present help in trouble. Therefore we will not fear though the earth gives way, though the mountains be moved into the heart of the sea..."
          </p>
          <div className="flex items-center gap-2 pt-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Continue Reading →</span>
          </div>
        </button>

        {/* Daily Quote */}
        <div className="mb-6 rounded-xl bg-card-deep p-4 text-center">
          <p className="font-serif text-sm italic text-muted-foreground">
            "As iron sharpens iron, so one person sharpens another."
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Proverbs 27:17</p>
        </div>

        {/* Community Devotional & Podcast */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/community")}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
          >
            <Globe className="h-5 w-5 text-primary" />
            <div className="text-center">
              <span className="text-sm font-medium">Community Devotional</span>
            </div>
          </button>
          <button
            onClick={() => {}}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
          >
            <Headphones className="h-5 w-5 text-primary" />
            <div className="text-center">
              <span className="text-sm font-medium">Podcast</span>
              <p className="text-[10px] text-muted-foreground">Coming Soon</p>
            </div>
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;