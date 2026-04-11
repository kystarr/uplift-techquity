import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const navItems = user
    ? [
        { label: "Search", onClick: () => go("/search") },
        { label: "Profile", onClick: () => go("/profile") },
        { label: "Messages", onClick: () => go("/messages") },
      ]
    : [
        { label: "Search", onClick: () => go("/search") },
        { label: "Register Business", onClick: () => go("/register/1") },
        { label: "Sign In/Sign Up", onClick: () => go("/auth") },
      ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/30 bg-glass backdrop-blur-[var(--blur-glass)] shadow-glass">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go to landing page"
              onClick={() => go("/")}
              className="rounded-xl"
            >
              <img
                src="/Uplift_Logo_No_Words.png"
                alt="Uplift"
                className="h-8 w-8"
              />
            </Button>
          </div>

          <div ref={menuRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className={cn("rounded-xl border border-white/40 bg-white/35 hover:bg-white/55 dark:bg-white/10 dark:hover:bg-white/20")}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-2xl glass-panel-strong p-3 space-y-3">
                <div className="rounded-xl bg-background/55 dark:bg-background/35 p-1 border border-white/20">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-smooth",
                        resolvedTheme !== "dark"
                          ? "bg-gradient-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setTheme("light")}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-smooth",
                        resolvedTheme === "dark"
                          ? "bg-gradient-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setTheme("dark")}
                    >
                      Dark
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/85 hover:bg-white/35 dark:hover:bg-white/10"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {user && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await signOut();
                      go("/");
                    }}
                  >
                    Sign Out
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};