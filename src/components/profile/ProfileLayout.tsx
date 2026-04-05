import { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";
import { Container } from "@/components/shared";
import { ProfileSidebar, type ProfileNavId } from "./ProfileSidebar";

export interface ProfileLayoutProps {
  active: ProfileNavId;
  children: ReactNode;
  /** Sidebar nav items (role-based) */
  navItems: { id: ProfileNavId; label: string }[];
}

export function ProfileLayout({ active, children, navItems }: ProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="7xl" padding="lg" className="py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="shrink-0 lg:w-56">
            <ProfileSidebar active={active} items={navItems} />
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </Container>
    </div>
  );
}
