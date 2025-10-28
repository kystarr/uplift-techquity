import { Navigation } from "@/components/Navigation";
import { Heart } from "lucide-react";

const Favorites = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-muted mb-6">
            <Heart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Your Favorites</h1>
          <p className="text-muted-foreground">
            Sign in to save and view your favorite businesses
          </p>
        </div>
      </div>
    </div>
  );
};

export default Favorites;
