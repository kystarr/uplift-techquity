import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Star, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

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
          {reviews.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between gap-4 flex-wrap">
                    <Link
                      to={`/business/${r.businessId}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View business
                    </Link>
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
                      <p className="text-sm whitespace-pre-wrap">{r.text || "—"}</p>
                      {r.moderationStatus && r.moderationStatus !== "visible" && (
                        <p className="text-xs text-muted-foreground">
                          Status: {r.moderationStatus.replace(/_/g, " ")}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(r.id);
                            setDraftText(r.text);
                            setDraftRating(Math.round(r.rating) || 5);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This cannot be undone.
                              </AlertDialogDescription>
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
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
