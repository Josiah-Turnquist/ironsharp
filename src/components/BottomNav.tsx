import { Home, BookOpen, Users, User, Library } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: BookOpen, label: "Devotionals", path: "/devotional" },
  { icon: Users, label: "Groups", path: "/groups" },
  { icon: Home, label: "Home", path: "/home" },
  { icon: Library, label: "Plans", path: "/plans" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="mx-auto flex max-w-lg items-center justify-evenly py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-1 flex-col items-center gap-0.5 py-1 text-xs"
            >
              {/* Icon with optional circle */}
              <div
                className="flex items-center justify-center transition-all duration-200 ease-in-out"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: active ? "hsl(var(--primary) / 0.15)" : "transparent",
                  transform: active ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                <Icon
                  className="h-5 w-5 transition-colors duration-200"
                  style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                />
              </div>
              {/* Label */}
              <span
                className="transition-colors duration-200"
                style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
