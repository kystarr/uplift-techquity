import { useAdminFlags } from '@/hooks/useAdminFlags';
import { Navigation } from '@/components/Navigation';
import { Container } from '@/components/shared';

/**
 * Admin flags queue stub.
 * Frontend dev: build the flag list/table UI here.
 *
 * Available data from useAdminFlags():
 * - flags: FlagItem[] (filtered by activeFilter)
 * - filterByStatus('PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTION_TAKEN' | 'ALL')
 * - counts: per-status totals
 * - refetch()
 */
const AdminFlags = () => {
  const { flags, loading, activeFilter, filterByStatus, counts } = useAdminFlags();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="lg" padding="lg">
        <h1 className="text-2xl font-bold mb-4">Flag Queue</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Showing: {activeFilter} ({flags.length} flags)</p>
            <p className="mt-4 italic">
              Stub page — frontend dev will build the flags table UI here.
            </p>
          </div>
        )}
      </Container>
    </div>
  );
};

export default AdminFlags;
