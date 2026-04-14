import { useEffect, useMemo, useState } from "react";
import { uploadData } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { useOwnerBusinessReviews } from "@/hooks/useOwnerBusinessReviews";
import { amplifyDataClient } from "@/amplifyDataClient";
import { useFlag } from "@/hooks/useFlag";
import { Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BusinessAnalyticsTab() {
  const { business, backendRow, loading, error, refetch } = useOwnerBusiness();
  const {
    reviews,
    loading: revLoading,
    refetch: refetchReviews,
    hideReview,
  } = useOwnerBusinessReviews(backendRow?.id);
  const { submitFlag, submitting: flagSubmitting } = useFlag();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bizName, setBizName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const flaggedCount = useMemo(
    () => reviews.filter((r) => (r.flagCount ?? 0) > 0).length,
    [reviews]
  );

  useEffect(() => {
    if (backendRow) {
      setPhone(backendRow.phone ?? "");
      setEmail(backendRow.contactEmail ?? "");
      setBizName(backendRow.businessName ?? "");
      setStreet(backendRow.street ?? "");
      setCity(backendRow.city ?? "");
      setState(backendRow.state ?? "");
      setZip(backendRow.zip ?? "");
    }
  }, [backendRow]);

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

  const id = backendRow.id;

  const saveContactOnly = async () => {
    setSavingContact(true);
    try {
      await amplifyDataClient.models.Business.update(
        {
          id,
          phone: phone.trim() || undefined,
          contactEmail: email.trim(),
        } as never,
        { authMode: "userPool" }
      );
      toast.success("Contact info saved");
      await refetch();
    } catch {
      toast.error("Save failed");
    } finally {
      setSavingContact(false);
    }
  };

  const submitVerification = async () => {
    if (!pendingDocs.length) {
      toast.error("Upload verification documents");
      return;
    }
    const session = await fetchAuthSession();
    const identityId = session.identityId;
    if (!identityId) {
      toast.error("Storage unavailable");
      return;
    }
    setVerifySubmitting(true);
    try {
      const keys: string[] = [];
      for (const file of pendingDocs) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `verification-documents/${identityId}/${Date.now()}-${safe}`;
        await uploadData({
          path,
          data: file,
          options: { contentType: file.type || "application/pdf" },
        }).result;
        keys.push(path);
      }
      await amplifyDataClient.mutations.requestBusinessProfileVerification(
        {
          businessId: id,
          documentKeys: keys,
          pendingBusinessName: bizName.trim() !== backendRow.businessName ? bizName.trim() : undefined,
          pendingStreet: street.trim() !== (backendRow.street ?? "") ? street.trim() : undefined,
          pendingCity: city.trim() !== (backendRow.city ?? "") ? city.trim() : undefined,
          pendingState: state.trim() !== (backendRow.state ?? "") ? state.trim() : undefined,
          pendingZip: zip.trim() !== (backendRow.zip ?? "") ? zip.trim() : undefined,
        },
        { authMode: "userPool" }
      );
      toast.success("Verification submitted — admin will review");
      setPendingDocs([]);
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification request failed");
    } finally {
      setVerifySubmitting(false);
    }
  };

  const identityChanged =
    bizName.trim() !== (backendRow.businessName ?? "") ||
    street.trim() !== (backendRow.street ?? "") ||
    city.trim() !== (backendRow.city ?? "") ||
    state.trim() !== (backendRow.state ?? "") ||
    zip.trim() !== (backendRow.zip ?? "");

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Business Analytics</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total reviews" value={String(backendRow.reviewCount ?? reviews.length)} />
        <Metric
          label="Average rating"
          value={(backendRow.averageRating ?? business.averageRating ?? 0).toFixed(1)}
        />
        <Metric label="Flagged reviews" value={String(flaggedCount)} />
        <Metric
          label="Customers contacted"
          value={String(backendRow.customersContactedCount ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>Phone and email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="button" onClick={saveContactOnly} disabled={savingContact}>
            {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save contact"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Name & address</CardTitle>
          <CardDescription>
            Changing display name or address requires document upload. Submitted requests are marked{" "}
            <strong>pending verification</strong> until an admin approves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={bizName} onChange={(e) => setBizName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Street</Label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>ZIP</Label>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Verification documents</Label>
            <Input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => setPendingDocs(Array.from(e.target.files ?? []))}
            />
          </div>
          <Button
            type="button"
            disabled={!identityChanged || verifySubmitting || !pendingDocs.length}
            onClick={submitVerification}
          >
            {verifySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for verification"}
          </Button>
          {backendRow.verificationStatus === "UNDER_REVIEW" && (
            <p className="text-sm text-amber-600">Your changes are under admin review.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review moderation</CardTitle>
          <CardDescription>
            Hide reviews from the public immediately (soft hide, pending admin). Flag harmful content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {revLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "border rounded-md p-3 text-sm space-y-2",
                    r.moderationStatus === "visible" || !r.moderationStatus ? "" : "opacity-80 bg-muted/40"
                  )}
                >
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="font-medium">{r.authorName}</span>
                    <span className="text-muted-foreground">
                      {r.moderationStatus?.replace(/_/g, " ") ?? "visible"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{r.text || "—"}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={
                        r.moderationStatus === "hidden_pending_admin" ||
                        r.moderationStatus === "removed"
                      }
                      onClick={async () => {
                        try {
                          await hideReview(r.id);
                          toast.success("Review hidden pending admin");
                          await refetchReviews();
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "Could not hide review");
                        }
                      }}
                    >
                      Hide from public
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={flagSubmitting}
                      onClick={async () => {
                        try {
                          await submitFlag({
                            targetType: "REVIEW",
                            targetId: r.id,
                            reason: "OTHER",
                            details: "Flagged by business owner from dashboard",
                            targetName: r.authorName,
                          });
                          toast.success("Flag submitted");
                        } catch {
                          toast.error("Flag failed");
                        }
                      }}
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      Flag
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
