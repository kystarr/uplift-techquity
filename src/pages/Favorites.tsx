import { Heart } from "lucide-react";
import { Container, EmptyState } from "@/components/shared";
import { Navigation } from "@/components/Navigation";

const Favorites = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="4xl" padding="lg">
        <EmptyState
          icon={Heart}
          title="Your Favorites"
          description="Sign in to save and view your favorite businesses"
        />
      </Container>
    </div>
  );
};

export default Favorites;
