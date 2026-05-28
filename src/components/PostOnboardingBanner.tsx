import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  "You + 2 others included",
  "All 5 color themes",
  "Core devotional plans",
  "Read-aloud and voice memos",
];

type Props = { onDismiss: () => void };

const PostOnboardingBanner = ({ onDismiss }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    setTimeout(onDismiss, 350);
  };

  const handleSeePlans = () => {
    setOpen(false);
    setTimeout(() => navigate("/pricing"), 200);
  };

  const handleContinueFree = () => {
    setOpen(false);
    setTimeout(() => navigate("/home", { replace: true }), 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ background: "rgba(92, 74, 58, 0.35)" }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl bg-card px-6 pb-8 pt-3 shadow-2xl transition-transform duration-[450ms]"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: "#D6C5AE" }} />

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "#F5EEE6" }}
          >
            <Sparkles className="h-7 w-7" style={{ color: "#A89070" }} />
          </div>
          <h2 className="font-serif text-xl font-bold" style={{ color: "#5C4A3A" }}>
            Enjoy your free account!
          </h2>
          <p className="mt-1 text-sm italic text-muted-foreground">
            You + 2 others, core plans, all themes — no cost, ever.
          </p>
        </div>

        <div
          className="mt-5 rounded-2xl p-4"
          style={{ background: "#FAF6EF" }}
        >
          <ul className="space-y-2">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2 font-serif text-sm"
                style={{ color: "#5C4A3A" }}
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "#A89070" }}
                />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleSeePlans}
          className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #89B4C9 0%, #6E9CB3 100%)",
          }}
        >
          See All Plans →
        </button>
        <button
          onClick={handleContinueFree}
          className="mt-3 w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Continue with Free
        </button>
      </div>
    </div>
  );
};

export default PostOnboardingBanner;