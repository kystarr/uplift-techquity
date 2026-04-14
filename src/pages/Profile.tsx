import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileLayout } from "@/components/profile/ProfileLayout";
import type { ProfileNavId } from "@/components/profile/ProfileSidebar";
import { ProfileTab } from "@/components/profile/ProfileTab";
import { FavoritesTab } from "@/components/profile/FavoritesTab";
import { ReviewsTab } from "@/components/profile/ReviewsTab";
import { BusinessAnalyticsTab } from "@/components/profile/BusinessAnalyticsTab";
import { AdminModerationTab } from "@/components/profile/AdminModerationTab";
import { Loader2 } from "lucide-react";

const STANDARD_NAV: { id: ProfileNavId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "favorites", label: "Favorites" },
  { id: "reviews", label: "My Reviews" },
];

const OWNER_NAV: { id: ProfileNavId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "business", label: "Business Analytics" },
];

const ADMIN_NAV: { id: ProfileNavId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "moderation", label: "Moderation" },
];

export default function ProfilePage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, isBusiness } = useAuth();

  const active: ProfileNavId = (() => {
    const t = tab ?? "profile";
    if (t === "profile" || t === "favorites" || t === "reviews" || t === "business" || t === "moderation") {
      return t;
    }
    return "profile";
  })();

  const navItems = useMemo(
    () => (isAdmin ? ADMIN_NAV : isBusiness ? OWNER_NAV : STANDARD_NAV),
    [isAdmin, isBusiness]
  );

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (isLoading || !user) return;
    const allowed = new Set(navItems.map((n) => n.id));
    if (!allowed.has(active)) {
      navigate("/profile", { replace: true });
    }
  }, [active, isLoading, user, navigate, navItems]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ProfileLayout active={active} navItems={navItems}>
      {active === "profile" && <ProfileTab />}
      {active === "favorites" && !isAdmin && !isBusiness && <FavoritesTab />}
      {active === "reviews" && !isAdmin && !isBusiness && <ReviewsTab />}
      {active === "business" && isBusiness && !isAdmin && <BusinessAnalyticsTab />}
      {active === "moderation" && isAdmin && <AdminModerationTab />}
    </ProfileLayout>
  );
}
