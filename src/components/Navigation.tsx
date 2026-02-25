import { Button } from "@/components/ui/button";
import { Menu, Search, Heart, User, MessageCircle, LogOut } from "lucide-react"; // Added LogOut icon
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";

export const Navigation = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ... Left Side (Logo & Discover) remains the same ... */}

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/search")}>
              <Search className="h-5 w-5" />
            </Button>
            
            {/* 3. Wrap protected buttons in a user check if you want them hidden when logged out */}
            {user && (
              <>
                <Button variant="ghost" size="icon" onClick={() => navigate("/favorites")}>
                  <Heart className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* 4. The Dynamic Auth Button */}
            {user ? (
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button 
                variant="default"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* ... Mobile Menu Trigger remains the same ... */}
        </div>

        {/* 5. Update Mobile Menu Auth Button too */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border">
            {/* ... other mobile links ... */}
            
            {user ? (
              <Button 
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                  navigate("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button 
                variant="default"
                className="w-full"
                onClick={() => {
                  navigate("/auth");
                  setMobileMenuOpen(false);
                }}
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};