import { Button } from "@/components/ui/button";
import { Menu, Search, Heart, User, MessageCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getCurrentUser } from "aws-amplify/auth";

export const Navigation = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Subscribe to auth state changes from Authenticator
  const { user, signOut } = useAuthenticator((context) => [
    context.user,
    context.route,
  ]);

  // Check auth state directly from Amplify (works with direct signIn calls)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    // Listen for custom auth state change events
    const handleAuthChange = () => checkAuth();
    window.addEventListener('authstatechange', handleAuthChange);
    
    return () => {
      window.removeEventListener('authstatechange', handleAuthChange);
    };
  }, []);

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
            {(user || isAuthenticated) && (
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
            {(user || isAuthenticated) ? (
              <Button 
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (err) {
                    // Fallback: sign out directly via Amplify
                    const { signOut: amplifySignOut } = await import('aws-amplify/auth');
                    await amplifySignOut();
                  }
                  setIsAuthenticated(false);
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
            
            {(user || isAuthenticated) ? (
              <Button 
                variant="outline"
                className="w-full gap-2"
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (err) {
                    // Fallback: sign out directly via Amplify
                    const { signOut: amplifySignOut } = await import('aws-amplify/auth');
                    await amplifySignOut();
                  }
                  setIsAuthenticated(false);
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