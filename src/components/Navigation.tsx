import { Button } from "@/components/ui/button";
import { Menu, Search, Heart, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const Navigation = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => navigate("/")}
              className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent hover:opacity-80 transition-smooth"
            >
              CommunityConnect
            </button>
            
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => navigate("/search")}
                className="text-sm font-medium text-foreground hover:text-primary transition-smooth"
              >
                Discover
              </button>
              <button 
                onClick={() => navigate("/search")}
                className="text-sm font-medium text-foreground hover:text-primary transition-smooth"
              >
                Categories
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/search")}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/favorites")}
            >
              <Heart className="h-5 w-5" />
            </Button>
            <Button 
              variant="default"
              onClick={() => navigate("/auth")}
            >
              <User className="h-4 w-4" />
              Sign In
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border">
            <button 
              onClick={() => {
                navigate("/search");
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-smooth"
            >
              Discover
            </button>
            <button 
              onClick={() => {
                navigate("/favorites");
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-smooth"
            >
              Favorites
            </button>
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
          </div>
        )}
      </div>
    </nav>
  );
};
