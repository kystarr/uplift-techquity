import { BusinessCard } from '@/components/BusinessCard';
import { Container, PageHeader } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useBusinessSearch } from '@/hooks/useBusinessSearch';
import { useUserLocation, haversineDistanceMiles } from '@/hooks/useUserLocation';
import { SearchFilters, type SearchFilterState } from '@/components/search/SearchFilters';
import { Navigation } from '@/components/Navigation';

/**
 * Discover / Search page.
 *
 * Data source: Amplify Gen 2 Business table (live, no mock data).
 * Filter: only businesses where verificationStatus === "APPROVED" are shown.
 *         This is enforced inside useBusinessSearch.
 *
 * The search input filters the already-loaded APPROVED list client-side
 * by name, category, or tags — no re-fetch needed per keystroke.
 * The filter sheet adds category, min-rating, and sort-by-distance controls.
 */
const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterState, setFilterState] = useState<SearchFilterState>({
    selectedCategories: [],
    minRating: 0,
    sortBy: 'relevance',
  });

  const { businesses, loading, error, refetch } = useBusinessSearch();
  const { coords, locationError, hasLocation, requesting, requestLocation } = useUserLocation();

  // All unique categories derived from loaded businesses
  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    businesses.forEach((b) => { if (b.category) seen.add(b.category); });
    return Array.from(seen).sort();
  }, [businesses]);

  const filtered = useMemo(() => {
    let list = [...businesses];

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (filterState.selectedCategories.length > 0) {
      list = list.filter((b) => filterState.selectedCategories.includes(b.category));
    }

    // Minimum rating filter
    if (filterState.minRating > 0) {
      list = list.filter((b) => b.rating >= filterState.minRating);
    }

    // Sort
    if (filterState.sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (filterState.sortBy === 'distance' && coords) {
      list.sort((a, b) => {
        const aDist =
          a.latitude != null && a.longitude != null
            ? haversineDistanceMiles(coords.latitude, coords.longitude, a.latitude, a.longitude)
            : Infinity;
        const bDist =
          b.latitude != null && b.longitude != null
            ? haversineDistanceMiles(coords.latitude, coords.longitude, b.latitude, b.longitude)
            : Infinity;
        return aDist - bDist;
      });
    }

    return list;
  }, [businesses, searchQuery, filterState, coords]);

  const getDistanceLabel = (lat?: number, lon?: number): string => {
    if (!hasLocation || lat == null || lon == null || !coords) return '';
    const miles = haversineDistanceMiles(coords.latitude, coords.longitude, lat, lon);
    return miles < 0.1 ? '< 0.1 mi' : `${miles.toFixed(1)} mi`;
  };

  const activeFilterCount =
    (filterState.selectedCategories.length > 0 ? 1 : 0) +
    (filterState.minRating > 0 ? 1 : 0) +
    (filterState.sortBy !== 'relevance' ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="7xl" className="space-y-8">
        <PageHeader
          title="Discover Local Businesses"
          description="Find and support minority-owned businesses in your community"
          actions={
            <Button
              variant={activeFilterCount > 0 ? 'default' : 'outline'}
              size="lg"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-5 w-5" />
              Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
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
              {searchQuery || activeFilterCount > 0
                ? 'No businesses match your search or filters.'
                : 'No businesses found.'}
            </p>
          </div>
        )}

        {/* Results grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filtered.map((business) => (
              <BusinessCard
                key={business.id}
                id={business.id}
                name={business.name}
                category={business.category}
                rating={business.rating}
                reviewCount={0}
                distance={getDistanceLabel(business.latitude, business.longitude)}
                image={
                  business.image ??
                  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop'
                }
                tags={business.tags}
                verified={business.verified}
              />
            ))}
          </div>
        )}
      </Container>

      <SearchFilters
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        availableCategories={availableCategories}
        filters={filterState}
        onFiltersChange={setFilterState}
        hasLocation={hasLocation}
        requestingLocation={requesting}
        locationError={locationError}
        onRequestLocation={requestLocation}
      />
    </div>
  );
};

export default Search;
