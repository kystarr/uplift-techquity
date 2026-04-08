import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type ProfileNavId = "profile" | "favorites" | "reviews" | "business" | "moderation";

export interface ProfileSidebarProps {
  active: ProfileNavId;
  items: { id: ProfileNavId; label: string }[];
}

export function ProfileSidebar({ active, items }: ProfileSidebarProps) {
  return (
    <nav aria-label="Profile sections" className="space-y-1">
      {items.map(({ id, label }) => (
        <Link
          key={id}
          to={id === "profile" ? "/profile" : `/profile/${id}`}
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
            active === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
