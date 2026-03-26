import * as React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ReviewFormProps {
  businessId: string;
  submitting?: boolean;
  onSubmit: (params: { businessId: string; rating: number; text: string; authorName: string }) => Promise<void>;
}

/**
 * Auth-gated review form. Shows a "sign in" prompt for guests.
 * Authenticated users get an interactive star selector, textarea, and an
 * optional "post anonymously" checkbox.
 */
export function ReviewForm({ businessId, submitting = false, onSubmit }: ReviewFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hovered, setHovered] = React.useState(0);
  const [selected, setSelected] = React.useState(0);
  const [text, setText] = React.useState('');
  const [anonymous, setAnonymous] = React.useState(false);

  if (!user) {
    return (
      <Card>
        <CardContent className="py-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary underline underline-offset-4 hover:opacity-80">
              Sign in
            </Link>{' '}
            to leave a review.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayName = anonymous ? 'Anonymous' : (user.signInDetails?.loginId?.split('@')[0] ?? user.username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected === 0) {
      toast({ title: "Please select a star rating.", variant: "destructive" });
      return;
    }
    try {
      await onSubmit({ businessId, rating: selected, text: text.trim(), authorName: anonymous ? 'Anonymous' : user.username });
      toast({ title: "Review submitted!", description: "Thanks for your feedback." });
      setSelected(0);
      setHovered(0);
      setText('');
      setAnonymous(false);
    } catch {
      toast({ title: "Failed to submit review.", description: "Please try again.", variant: "destructive" });
    }
  };

  const displayRating = hovered || selected;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Write a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Your rating</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={selected === star}
                  aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setSelected(star)}
                >
                  <Star
                    className={cn(
                      'h-7 w-7 transition-colors',
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Comment (optional)</p>
            <Textarea
              placeholder="Share your experience with this business..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="anonymous-review"
              checked={anonymous}
              onCheckedChange={(checked) => setAnonymous(checked === true)}
            />
            <Label htmlFor="anonymous-review" className="text-sm font-normal cursor-pointer">
              Post anonymously
            </Label>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Posting as <span className="font-medium text-foreground">{displayName}</span>
            </p>
            <Button type="submit" disabled={submitting || selected === 0}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
