import { Navigation } from "@/components/Navigation";
import { BusinessCard } from "@/components/BusinessCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

// Mock data
const mockBusinesses = [
  {
    id: "1",
    name: "Natural Essence Hair Studio",
    category: "Beauty & Wellness",
    rating: 4.9,
    reviewCount: 234,
    distance: "0.8 mi",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
    tags: ["Natural Hair", "Braiding", "Locs"],
    verified: true,
    familyFriendly: true,
  },
  {
    id: "2",
    name: "Soul Food Kitchen",
    category: "Restaurant",
    rating: 4.8,
    reviewCount: 456,
    distance: "1.2 mi",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    tags: ["Southern Cuisine", "Comfort Food", "Catering"],
    verified: true,
    familyFriendly: true,
  },
  {
    id: "3",
    name: "Mindful Wellness Center",
    category: "Mental Health",
    rating: 5.0,
    reviewCount: 127,
    distance: "2.1 mi",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
    tags: ["Therapy", "Counseling", "Wellness"],
    verified: true,
  },
  {
    id: "4",
    name: "Heritage Books & Coffee",
    category: "Retail & Cafe",
    rating: 4.7,
    reviewCount: 189,
    distance: "0.5 mi",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    tags: ["Books", "Coffee", "Events"],
    verified: true,
    familyFriendly: true,
  },
  {
    id: "5",
    name: "Empowered Birth Doula Services",
    category: "Healthcare",
    rating: 5.0,
    reviewCount: 92,
    distance: "3.0 mi",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&h=300&fit=crop",
    tags: ["Doula", "Birth Support", "Maternal Health"],
    verified: true,
  },
  {
    id: "6",
    name: "Urban Tech Solutions",
    category: "Technology Services",
    rating: 4.9,
    reviewCount: 203,
    distance: "1.8 mi",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop",
    tags: ["IT Support", "Web Design", "Consulting"],
    verified: true,
  },
];

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Discover Local Businesses</h1>
            <p className="text-muted-foreground">Find and support minority-owned businesses in your community</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, service, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" size="lg">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockBusinesses.map((business) => (
              <BusinessCard key={business.id} {...business} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
