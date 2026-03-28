import { Navigation } from '@/components/Navigation';
import { Container } from '@/components/shared';
import { useAdminModeration } from '@/hooks/useAdminModeration';

/**
 * Admin business moderation stub.
 * Frontend dev: build the business list with verification status filters here.
 *
 * Available actions from useAdminModeration():
 * - updateBusinessStatus(businessId, 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'PENDING')
 *
 * For listing businesses, use amplifyDataClient.models.Business.list() directly
 * or create a dedicated hook.
 */
const AdminBusinesses = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="lg" padding="lg">
        <h1 className="text-2xl font-bold mb-4">Business Moderation</h1>
        <p className="text-sm text-muted-foreground italic">
          Stub page — frontend dev will build the business moderation UI here.
        </p>
      </Container>
    </div>
  );
};

export default AdminBusinesses;
