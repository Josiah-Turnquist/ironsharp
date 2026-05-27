import AppLayout from "@/components/AppLayout";
import { Globe, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CommunityFeed = () => {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate("/home")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-1 font-serif text-2xl font-bold">Community</h1>
        <p className="mb-8 text-sm text-muted-foreground">Shared devotionals & reflections</p>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-deep px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 font-serif text-lg font-semibold">Coming Soon</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            A space to share reflections with the broader IronSharp community. Stay tuned.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default CommunityFeed;