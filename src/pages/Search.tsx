import { BusinessSummaryCard } from "@/components/search";
import { Navigation } from "@/components/Navigation";
import { Container, PageHeader } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import { useBusinessSearch } from "@/hooks/useBusinessSearch";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { businesses, loading, error, refetch } = useBusinessSearch();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return businesses;
    const q = searchQuery.toLowerCase();
    return businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [businesses, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="7xl" className="space-y-8">
        <PageHeader
          title="Discover Local Businesses"
          description="Find and support minority-owned businesses in your community"
          actions={
            <Button variant="outline" size="lg">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, service, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card h-72 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted-foreground text-sm">
              Couldn't load businesses. Please try again.
            </p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? "No businesses match your search."
                : "No businesses found."}
            </p>
          </div>
        )}

        {/* Results grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filtered.map((business) => (
              <BusinessSummaryCard
                key={business.id}
                name={business.name}
                category={business.category}
                rating={business.rating}
                reviewCount={0}
                image={business.image}
                tags={business.tags}
                verified={business.verified}
              />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
};

export default Search;
