import { BusinessCardGrid } from "@/components/search";
import { Container, PageHeader } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockBusinesses } from "@/data/mockBusinesses";
import type { BusinessSummaryData } from "@/types/business";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBusinesses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mockBusinesses;
    return mockBusinesses.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const openThread = (business: BusinessSummaryData) => {
    navigate(`/messages/${business.id}`, { state: { business } });
  };

  return (
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
      </div>

      <BusinessCardGrid businesses={filteredBusinesses} onMessageClick={openThread} />
    </Container>
  );
};

export default Search;
