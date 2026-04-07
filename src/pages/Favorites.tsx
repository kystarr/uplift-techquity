import { Heart } from "lucide-react";
import { Container, EmptyState } from "@/components/shared";

const Favorites = () => {
  return (
    <Container maxWidth="4xl" padding="lg">
      <EmptyState
        icon={Heart}
        title="Your Favorites"
        description="Sign in to save and view your favorite businesses"
      />
    </Container>
  );
};

export default Favorites;
