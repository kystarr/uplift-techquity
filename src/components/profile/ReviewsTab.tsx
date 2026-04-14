import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMyReviews } from "@/hooks/useMyReviews";
import { Star, Loader2, Pencil, MoreVertical, Trash2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop";

function formatReviewDate(createdAt?: string): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReviewsTab() {
  const { reviews, loading, removeReview, updateReview, refetch } = useMyReviews();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftRating, setDraftRating] = useState(5);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your reviews…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">My reviews</h1>
      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">You have not written any reviews yet.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => {
            const reviewDate = formatReviewDate(r.createdAt);
            return (
            <li key={r.id}>
              <Card className="relative">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${
                              n <= (editingId === r.id ? draftRating : r.rating)
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      {reviewDate && <p className="text-xs text-muted-foreground">{reviewDate}</p>}
                    </div>
                    {editingId !== r.id && (
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground"
                              aria-label="Review options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditingId(r.id);
                                setDraftText(r.text);
                                setDraftRating(Math.round(r.rating) || 5);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await removeReview(r.id);
                                  toast.success("Review deleted");
                                } catch {
                                  toast.error("Failed to delete");
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  {editingId === r.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Button
                            key={n}
                            type="button"
                            size="sm"
                            variant={draftRating >= n ? "default" : "outline"}
                            onClick={() => setDraftRating(n)}
                          >
                            {n}
                          </Button>
                        ))}
                      </div>
                      <Textarea
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await updateReview(r.id, draftText, draftRating);
                              setEditingId(null);
                              toast.success("Review updated");
                              await refetch();
                            } catch {
                              toast.error("Could not update review");
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Link to={`/business/${r.businessId}`} className="block">
                        <div className="rounded-lg border overflow-hidden hover:bg-muted/30 transition-colors">
                          <div className="flex">
                            <img
                              src={r.businessImage || FALLBACK_IMAGE}
                              alt={r.businessName}
                              className="h-20 w-24 object-cover shrink-0"
                            />
                            <div className="p-3 min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{r.businessName}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {r.businessCategory}
                                  </p>
                                </div>
                                {r.businessVerified && (
                                  <Badge className="bg-success text-success-foreground border-0 p-1">
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                      {r.text.trim().length > 0 && (
                        <p className="text-sm whitespace-pre-wrap">{r.text}</p>
                      )}
                      {r.moderationStatus && r.moderationStatus !== "visible" && (
                        <p className="text-xs text-muted-foreground">
                          Status: {r.moderationStatus.replace(/_/g, " ")}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
