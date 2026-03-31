import { useAdminFlags } from '@/hooks/useAdminFlags';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Navigation } from '@/components/Navigation';
import { Container } from '@/components/shared';

/**
 * Admin dashboard stub — overview of platform moderation stats.
 * Frontend dev: build out the UI using the data from useAdminFlags and useAdminNotifications.
 *
 * Available data:
 * - flags.counts: { ALL, PENDING, REVIEWED, DISMISSED, ACTION_TAKEN }
 * - notifications.unreadCount
 * - notifications.notifications: list of AdminNotificationItem[]
 */
const AdminDashboard = () => {
  const { counts, loading: flagsLoading } = useAdminFlags();
  const { unreadCount, loading: notifsLoading } = useAdminNotifications();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="lg" padding="lg">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        {flagsLoading || notifsLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Open flags: {counts.PENDING}</p>
            <p>Total flags: {counts.ALL}</p>
            <p>Unread notifications: {unreadCount}</p>
            <p className="mt-4 italic">
              Stub page — frontend dev will build the full dashboard UI here.
            </p>
          </div>
        )}
      </Container>
    </div>
  );
};

export default AdminDashboard;
