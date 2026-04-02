import { Button } from "@/components/ui/button";
import { Menu, Search, User, MessageCircle, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSearchPage = location.pathname === "/search";

  const go = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left side: logo (no words) */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go to landing page"
              onClick={() => go("/")}
            >
              <img
                src="/Uplift_Logo_No_Words.png"
                alt="Uplift"
                className="h-8 w-8"
              />
            </Button>
          </div>

          {/* Right side: search (all pages except /search), profile/messages, sign out */}
          <div className="flex items-center gap-2">
            {!user && (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" onClick={() => go("/auth")}>
                  Sign In
                </Button>
                <Button onClick={() => go("/register/1")}>
                  Register Your Business
                </Button>
              </div>
            )}

            {!isSearchPage && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Go to search"
                onClick={() => go("/search")}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Profile"
                  onClick={() => go("/profile")}
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Messages"
                  onClick={() => go("/messages")}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </>
            )}

            {user ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  await signOut();
                  go("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border">
            {!isSearchPage && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => go("/search")}
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            )}

            {!user ? (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => go("/auth")}
                >
                  <User className="h-4 w-4" />
                  Sign In
                </Button>
                <Button className="w-full justify-start gap-2" onClick={() => go("/register/1")}>
                  Register Your Business
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => go("/profile")}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => go("/messages")}
                >
                  <MessageCircle className="h-4 w-4" />
                  Messages
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={async () => {
                    await signOut();
                    go("/");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};