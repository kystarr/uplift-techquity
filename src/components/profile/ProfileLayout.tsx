import { ReactNode } from "react";
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
    <div className="bg-background">
      <Container maxWidth="7xl" padding="lg" className="py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="shrink-0 lg:w-56 glass-panel rounded-2xl p-3 h-fit">
            <ProfileSidebar active={active} items={navItems} />
          </aside>
          <main className="flex-1 min-w-0 glass-panel rounded-2xl p-5">{children}</main>
        </div>
      </Container>
    </div>
  );
}
