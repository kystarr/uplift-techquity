import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { useOwnerBusinessReviews } from "@/hooks/useOwnerBusinessReviews";
import { amplifyDataClient } from "@/amplifyDataClient";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type TrendPoint = {
  week: string;
  ts: number;
  favorites: number;
  uniqueContacts: number;
  reviews: number;
  profileViews: number;
};

type TimeRange = "1D" | "1W" | "1M" | "3M" | "ALL";

type BenchmarkStats = {
  appAverageRating: number;
  appAverageViews: number;
  ratingPercentile: number;
  viewsPercentile: number;
  businessCount: number;
};

const trendChartConfig = {
  favorites: { label: "Favorites", color: "hsl(var(--chart-1))" },
  uniqueContacts: { label: "Unique Contacts", color: "hsl(var(--chart-2))" },
  reviews: { label: "Reviews", color: "hsl(var(--chart-3))" },
  profileViews: { label: "Profile Views", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function weekKey(date: Date) {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function weekLabel(key: string) {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function BusinessAnalyticsTab() {
  const { business, backendRow, loading, error, refetch } = useOwnerBusiness();
  const {
    reviews,
  } = useOwnerBusinessReviews(backendRow?.id);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [uniqueContactsCount, setUniqueContactsCount] = useState(0);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [profileViewsCount, setProfileViewsCount] = useState(0);
  const [reviewsCountInRange, setReviewsCountInRange] = useState(0);
  const [benchmark, setBenchmark] = useState<BenchmarkStats | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");

  const inRange = (iso: string | undefined, range: TimeRange) => {
    if (!iso) return false;
    if (range === "ALL") return true;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const ms =
      range === "1D"
        ? 24 * 60 * 60 * 1000
        : range === "1W"
          ? 7 * 24 * 60 * 60 * 1000
          : range === "1M"
            ? 30 * 24 * 60 * 60 * 1000
            : 90 * 24 * 60 * 60 * 1000;
    return now.getTime() - d.getTime() <= ms;
  };

  const bucketKey = (iso: string, range: TimeRange) => {
    const d = new Date(iso);
    if (range === "1D") {
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
    }
    if (range === "1W" || range === "1M" || range === "3M") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return weekLabel(weekKey(d));
  };

  const buildSeedBuckets = (range: TimeRange): TrendPoint[] => {
    const now = new Date();
    const buckets: TrendPoint[] = [];

    if (range === "1D") {
      for (let i = 23; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setMinutes(0, 0, 0);
        d.setHours(now.getHours() - i);
        buckets.push({
          week: `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`,
          ts: d.getTime(),
          favorites: 0,
          uniqueContacts: 0,
          reviews: 0,
          profileViews: 0,
        });
      }
      return buckets;
    }

    if (range === "1W" || range === "1M" || range === "3M") {
      const days = range === "1W" ? 7 : range === "1M" ? 30 : 90;
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(now.getDate() - i);
        buckets.push({
          week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          ts: d.getTime(),
          favorites: 0,
          uniqueContacts: 0,
          reviews: 0,
          profileViews: 0,
        });
      }
      return buckets;
    }

    return [];
  };

  useEffect(() => {
    if (!backendRow?.id) return;

    const loadTrendData = async () => {
      setTrendLoading(true);
      try {
        const [favoriteRes, conversationRes, profileViewRes, businessRes] = await Promise.all([
          (amplifyDataClient.models as any).Favorite.list({ authMode: "userPool" }),
          (amplifyDataClient.models as any).Conversation.list({ authMode: "userPool" }),
          (amplifyDataClient.models as any).BusinessProfileView.list({ authMode: "userPool" }),
          (amplifyDataClient.models as any).Business.list({ authMode: "userPool" }),
        ]);

        const favoriteRows = (favoriteRes?.data ?? []).filter(
          (f: any) => f.businessId === backendRow.id && inRange(f.createdAt, timeRange)
        );
        const conversationRows = (conversationRes?.data ?? []).filter(
          (c: any) => c.businessId === backendRow.id && inRange(c.createdAt, timeRange)
        );
        const profileViewRows = (profileViewRes?.data ?? []).filter(
          (v: any) => v.businessId === backendRow.id && inRange(v.viewedAt, timeRange)
        );
        const allBusinesses = (businessRes?.data ?? []).filter((b: any) => b.verificationStatus === "APPROVED");

        setFavoritesCount(favoriteRows.length);
        setUniqueContactsCount(
          new Set(
            conversationRows
              .map((c: any) => (typeof c.participantId === "string" ? c.participantId.trim() : ""))
              .filter(Boolean)
          ).size
        );
        setProfileViewsCount(profileViewRows.length);
        const rangeReviews = reviews.filter((r) => inRange(r.createdAt, timeRange));
        setReviewsCountInRange(rangeReviews.length);

        const allViewCounts = new Map<string, number>();
        (profileViewRes?.data ?? []).forEach((row: any) => {
          if (!row.businessId) return;
          allViewCounts.set(row.businessId, (allViewCounts.get(row.businessId) ?? 0) + 1);
        });

        const ratings = allBusinesses.map((b: any) =>
          typeof b.averageRating === "number" ? b.averageRating : 0
        );
        const viewCounts = allBusinesses.map((b: any) => allViewCounts.get(b.id) ?? 0);
        const appAverageRating =
          ratings.length > 0 ? ratings.reduce((sum, n) => sum + n, 0) / ratings.length : 0;
        const appAverageViews =
          viewCounts.length > 0 ? viewCounts.reduce((sum, n) => sum + n, 0) / viewCounts.length : 0;
        const myRating = typeof backendRow.averageRating === "number" ? backendRow.averageRating : 0;
        const myViews = profileViewRows.length;
        const ratingPercentile =
          ratings.length > 0
            ? Math.round((ratings.filter((r) => r <= myRating).length / ratings.length) * 100)
            : 0;
        const viewsPercentile =
          viewCounts.length > 0
            ? Math.round((viewCounts.filter((v) => v <= myViews).length / viewCounts.length) * 100)
            : 0;

        setBenchmark({
          appAverageRating,
          appAverageViews,
          ratingPercentile,
          viewsPercentile,
          businessCount: allBusinesses.length,
        });

        const base = new Map<string, TrendPoint>();
        buildSeedBuckets(timeRange).forEach((b) => {
          base.set(b.week, b);
        });

        favoriteRows.forEach((row: any) => {
          if (!row.createdAt) return;
          const k = bucketKey(row.createdAt, timeRange);
          if (!base.has(k)) {
            base.set(k, { week: k, ts: new Date(row.createdAt).getTime(), favorites: 0, uniqueContacts: 0, reviews: 0, profileViews: 0 });
          }
          base.get(k)!.favorites += 1;
        });

        const weeklyUniqueContacts = new Map<string, Set<string>>();
        conversationRows.forEach((row: any) => {
          if (!row.createdAt || !row.participantId) return;
          const k = bucketKey(row.createdAt, timeRange);
          if (!weeklyUniqueContacts.has(k)) {
            weeklyUniqueContacts.set(k, new Set<string>());
          }
          weeklyUniqueContacts.get(k)?.add(String(row.participantId));
        });
        weeklyUniqueContacts.forEach((participants, k) => {
          const cur = base.get(k);
          if (cur) cur.uniqueContacts = participants.size;
        });

        rangeReviews.forEach((row) => {
          if (!row.createdAt) return;
          const k = bucketKey(row.createdAt, timeRange);
          if (!base.has(k)) {
            base.set(k, { week: k, ts: new Date(row.createdAt).getTime(), favorites: 0, uniqueContacts: 0, reviews: 0, profileViews: 0 });
          }
          base.get(k)!.reviews += 1;
        });

        profileViewRows.forEach((row: any) => {
          if (!row.viewedAt) return;
          const k = bucketKey(row.viewedAt, timeRange);
          if (!base.has(k)) {
            base.set(k, { week: k, ts: new Date(row.viewedAt).getTime(), favorites: 0, uniqueContacts: 0, reviews: 0, profileViews: 0 });
          }
          base.get(k)!.profileViews += 1;
        });

        setTrendData(Array.from(base.values()).sort((a, b) => a.ts - b.ts));
      } catch {
        toast.error("Could Not Load Trend Data");
      } finally {
        setTrendLoading(false);
      }
    };

    void loadTrendData();
  }, [backendRow, reviews, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading business…
      </div>
    );
  }

  if (error || !business || !backendRow) {
    return (
      <div className="space-y-3 text-muted-foreground max-w-lg">
        {error ? (
          <p className="text-destructive text-sm whitespace-pre-wrap">{error.message}</p>
        ) : (
          <p>
            No business found for your account. If you used the seed script, Sign In/Sign Up with that same
            email and ensure <code className="text-xs bg-muted px-1 rounded">amplify_outputs.json</code>{" "}
            is from your latest sandbox deploy.
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Retry loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Business Analytics</h1>
      <div className="flex flex-wrap gap-2">
        {(["1D", "1W", "1M", "3M", "ALL"] as const).map((range) => (
          <Button
            key={range}
            type="button"
            size="sm"
            variant={timeRange === range ? "default" : "outline"}
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Profile Views" value={String(profileViewsCount)} />
        <Metric label="Total Reviews" value={String(reviewsCountInRange)} />
        <Metric label="Total Favorites" value={String(favoritesCount)} />
        <Metric label="Customers Contacted" value={String(uniqueContactsCount)} />
        <Metric
          label="Average Rating"
          value={(backendRow.averageRating ?? business.averageRating ?? 0).toFixed(1)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Benchmark vs Marketplace</CardTitle>
          <CardDescription>
            Compare your business against other approved businesses on Uplift.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Average Rating</p>
              <p className="text-sm mt-1">
                You: <span className="font-semibold">{(backendRow.averageRating ?? 0).toFixed(1)}</span>
              </p>
              <p className="text-sm">
                App Avg: <span className="font-semibold">{(benchmark?.appAverageRating ?? 0).toFixed(1)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Better than about {benchmark?.ratingPercentile ?? 0}% of businesses.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Profile Views</p>
              <p className="text-sm mt-1">
                You: <span className="font-semibold">{profileViewsCount.toLocaleString()}</span>
              </p>
              <p className="text-sm">
                App Avg: <span className="font-semibold">{Math.round(benchmark?.appAverageViews ?? 0).toLocaleString()}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Better than about {benchmark?.viewsPercentile ?? 0}% of businesses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trend Overview</CardTitle>
          <CardDescription>
            Profile views, favorites, unique contacts, and reviews for {timeRange}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[260px] w-full">
              <LineChart data={trendData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="favorites"
                  stroke="var(--color-favorites)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="uniqueContacts"
                  stroke="var(--color-uniqueContacts)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="reviews"
                  stroke="var(--color-reviews)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="profileViews"
                  stroke="var(--color-profileViews)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Hover over points to inspect values at each point in time.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Mix</CardTitle>
          <CardDescription>
            Snapshot of key activity counts for your business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendChartConfig} className="h-[220px] w-full">
            <BarChart
              data={[
                {
                  metric: "Favorites",
                  count: favoritesCount,
                },
                {
                  metric: "Unique Contacts",
                  count: uniqueContactsCount,
                },
                {
                  metric: "Reviews",
                  count: reviewsCountInRange,
                },
                {
                  metric: "Profile Views",
                  count: profileViewsCount,
                },
              ]}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="metric" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={6} fill="hsl(var(--primary))" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
