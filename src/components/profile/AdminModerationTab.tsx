import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminFlags } from "@/hooks/useAdminFlags";
import { useAdminModeration } from "@/hooks/useAdminModeration";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { amplifyDataClient } from "@/amplifyDataClient";
import {
  withDataAuthModeFallback,
  withDataAuthModeMutation,
} from "@/lib/data-query-auth-fallback";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getUrl } from "aws-amplify/storage";

interface HiddenQueueRow {
  reviewId: string;
  businessId: string;
  businessName?: string;
  text?: string;
}

interface PendingBizRow {
  businessId: string;
  businessName?: string;
  legalBusinessName?: string;
  businessType?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  description?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  pendingBusinessName?: string;
  pendingStreet?: string;
  pendingCity?: string;
  pendingState?: string;
  pendingZip?: string;
  verificationDocumentKeys?: string[];
}

interface ActivityRow {
  id: string;
  action: string;
  targetType?: string;
  targetId?: string;
  createdAt?: string;
}

export function AdminModerationTab() {
  const { flags, loading, refetch, filterByStatus, activeFilter, counts } = useAdminFlags();
  const {
    resolveFlag,
    removeReview,
    adminResolveHiddenReview,
    adminRemoveUser,
    adminResolveBusinessVerification,
    loading: actionLoading,
  } = useAdminModeration();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch: refetchNotif } =
    useAdminNotifications();

  const [hidden, setHidden] = useState<HiddenQueueRow[]>([]);
  const [hiddenLoading, setHiddenLoading] = useState(true);
  const [pendingBiz, setPendingBiz] = useState<PendingBizRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [removeUserId, setRemoveUserId] = useState("");
  const [openingDocKey, setOpeningDocKey] = useState<string | null>(null);

  const loadQueues = async () => {
    setHiddenLoading(true);
    setPendingLoading(true);
    setActivityLoading(true);
    try {
      const [hiddenResult, pendingResult, activityResult] = await Promise.allSettled([
        withDataAuthModeFallback<HiddenQueueRow>("Hidden reviews", (authMode) =>
          amplifyDataClient.queries.listHiddenReviewsForAdmin({}, { authMode })
        ),
        withDataAuthModeFallback<PendingBizRow>("Pending verification", (authMode) =>
          amplifyDataClient.queries.listPendingBusinessVerifications({}, { authMode })
        ),
        withDataAuthModeFallback<ActivityRow>("Activity log", (authMode) =>
          amplifyDataClient.queries.listAdminActivityLog({}, { authMode })
        ),
      ]);

      if (hiddenResult.status === "fulfilled") {
        setHidden(hiddenResult.value.data);
      }

      if (pendingResult.status === "fulfilled") {
        setPendingBiz(pendingResult.value.data);
      }

      if (activityResult.status === "fulfilled") {
        const fromQuery = activityResult.value.data;
        if (fromQuery.length > 0) {
          setActivity(fromQuery);
        } else {
          const fallbackActivity = await loadActivityFromNotifications();
          setActivity(fallbackActivity);
        }
      }

      if (
        hiddenResult.status === "rejected" ||
        pendingResult.status === "rejected" ||
        activityResult.status === "rejected"
      ) {
        if (activityResult.status === "rejected") {
          const fallbackActivity = await loadActivityFromNotifications();
          setActivity(fallbackActivity);
        }
        toast.error("Some moderation queues could not be loaded.");
      }
    } finally {
      setHiddenLoading(false);
      setPendingLoading(false);
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    loadQueues();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Moderation</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            refetch();
            refetchNotif();
            loadQueues();
            toast.success("Refreshed");
          }}
        >
          Refresh all
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>{unreadCount} unread</CardDescription>
          </div>
          <Button size="sm" variant="secondary" onClick={() => markAllAsRead()}>
            Mark all read
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40 pr-3">
            <ul className="space-y-2 text-sm">
              {notifications.slice(0, 15).map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex justify-between gap-2 border-b border-border/60 pb-2",
                    !n.read && "font-medium"
                  )}
                >
                  <button
                    type="button"
                    className="text-left flex-1"
                    onClick={() => markAsRead(n.id)}
                  >
                    {n.title}
                    <span className="block text-xs text-muted-foreground font-normal">
                      {n.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      <Tabs defaultValue="verify" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="flags">Flag queue ({counts.ALL})</TabsTrigger>
          <TabsTrigger value="hidden">Hidden reviews</TabsTrigger>
          <TabsTrigger value="verify">Pending verification</TabsTrigger>
          <TabsTrigger value="activity">Activity log</TabsTrigger>
          <TabsTrigger value="destructive">Destructive</TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PENDING", "RESOLVED"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={activeFilter === s ? "default" : "outline"}
                onClick={() => filterByStatus(s)}
              >
                {s} ({counts[s] ?? counts.ALL})
              </Button>
            ))}
          </div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <ul className="space-y-3">
              {flags.map((f) => (
                <li key={f.id} className="border rounded-md p-3 text-sm space-y-2">
                  <div className="flex flex-wrap gap-2 justify-between">
                    <span className="font-medium">
                      {f.targetType} · {f.reason}
                    </span>
                    <span className="text-muted-foreground">{f.status}</span>
                  </div>
                  <p className="text-muted-foreground">{f.details || "—"}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={actionLoading || f.status === "RESOLVED"}
                      onClick={async () => {
                        try {
                          await resolveFlag({ flagId: f.id });
                          toast.success("Flag resolved");
                          await refetch();
                          await loadQueues();
                        } catch (e) {
                          toast.error(toReadableErrorMessage(e, "Failed to resolve flag"));
                        }
                      }}
                    >
                      Resolve
                    </Button>
                    {f.targetType === "REVIEW" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionLoading}
                        onClick={async () => {
                          const bid =
                            f.targetDetails?.businessId ??
                            (await fetchBusinessIdForReview(f.targetId));
                          if (!bid) {
                            toast.error("Could not resolve business for review");
                            return;
                          }
                          try {
                            await removeReview(f.targetId, bid);
                            toast.success("Review removed");
                            await refetch();
                            await loadQueues();
                          } catch (e) {
                            toast.error(toReadableErrorMessage(e, "Failed to remove review"));
                          }
                        }}
                      >
                        Remove review
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="hidden" className="mt-4 space-y-3">
          {hiddenLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            hidden.map((h) => (
              <div key={h.reviewId} className="border rounded-md p-3 text-sm space-y-2">
                <p className="font-medium">{h.businessName}</p>
                <p className="text-muted-foreground">{h.text}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        await adminResolveHiddenReview(h.reviewId, "APPROVE_HIDE");
                        toast.success("Hide approved");
                        await loadQueues();
                      } catch (e) {
                        toast.error(toReadableErrorMessage(e, "Failed to approve hide"));
                      }
                    }}
                  >
                    Approve hide
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        await adminResolveHiddenReview(h.reviewId, "RESTORE");
                        toast.success("Review restored");
                        await loadQueues();
                      } catch (e) {
                        toast.error(toReadableErrorMessage(e, "Failed to restore review"));
                      }
                    }}
                  >
                    Restore visibility
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="verify" className="mt-4 space-y-3">
          {pendingLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : pendingBiz.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending verifications.</p>
          ) : (
            pendingBiz.map((b) => (
              <div key={b.businessId} className="border rounded-md p-3 text-sm space-y-2">
                <p className="font-medium">{b.businessName}</p>
                <p className="text-xs text-muted-foreground">{b.contactEmail}</p>
                <div className="text-xs bg-muted p-2 rounded-md space-y-1">
                  {applicationDetailsForRow(b).map(({ label, value }) => (
                    <p key={label}>
                      <span className="font-medium">{label}:</span> {value}
                    </p>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Verification documents</p>
                  {b.verificationDocumentKeys && b.verificationDocumentKeys.length > 0 ? (
                    <ul className="space-y-1">
                      {b.verificationDocumentKeys.map((key) => (
                        <li key={key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-muted-foreground">
                            {readableVerificationFileName(key)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={openingDocKey === key}
                            onClick={async () => {
                              try {
                                setOpeningDocKey(key);
                                const { url } = await getUrl({ path: key });
                                window.open(url.toString(), "_blank", "noopener,noreferrer");
                              } catch (e) {
                                toast.error(toReadableErrorMessage(e, "Unable to open document"));
                              } finally {
                                setOpeningDocKey(null);
                              }
                            }}
                          >
                            {openingDocKey === key ? "Opening..." : "View"}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No documents attached.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        await adminResolveBusinessVerification(b.businessId, "APPROVE");
                        toast.success("Approved");
                        await loadQueues();
                      } catch (e) {
                        toast.error(toReadableErrorMessage(e, "Failed to approve verification"));
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        await adminResolveBusinessVerification(b.businessId, "REJECT");
                        toast.success("Rejected");
                        await loadQueues();
                      } catch (e) {
                        toast.error(toReadableErrorMessage(e, "Failed to reject verification"));
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {activityLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ul className="text-sm space-y-2">
              {activity.map((row) => (
                <li key={row.id} className="border-b pb-2">
                  <span className="font-medium">{row.action}</span>
                  <span className="text-muted-foreground ml-2">
                    {row.targetType} {row.targetId}
                  </span>
                  <span className="block text-xs text-muted-foreground">{row.createdAt}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="destructive" className="mt-4 space-y-6 max-w-md">
          <div className="space-y-2">
            <LabelledInput
              label="Remove user by User table id"
              value={removeUserId}
              onChange={setRemoveUserId}
              placeholder="user uuid"
            />
            <Button
              type="button"
              variant="destructive"
              disabled={actionLoading || !removeUserId.trim()}
              onClick={async () => {
                try {
                  await adminRemoveUser(removeUserId.trim());
                  toast.success("User removed");
                  setRemoveUserId("");
                  await loadQueues();
                } catch (e) {
                  toast.error(toReadableErrorMessage(e, "Failed to remove user"));
                }
              }}
            >
              Remove user
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Remove business is now available directly on each business profile page for safer, in-context moderation.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function applicationDetailsForRow(b: PendingBizRow): Array<{ label: string; value: string }> {
  const effectiveBusinessName = b.pendingBusinessName?.trim() || b.businessName?.trim() || "—";
  const effectiveStreet = b.pendingStreet?.trim() || b.street?.trim() || "—";
  const effectiveCity = b.pendingCity?.trim() || b.city?.trim() || "—";
  const effectiveState = b.pendingState?.trim() || b.state?.trim() || "—";
  const effectiveZip = b.pendingZip?.trim() || b.zip?.trim() || "—";

  return [
    { label: "Business Name", value: effectiveBusinessName },
    { label: "Business Type", value: b.businessType?.trim() || "—" },
    { label: "Business Owner Name", value: b.contactName?.trim() || "—" },
    { label: "Contact Email", value: b.contactEmail?.trim() || "—" },
    { label: "Phone", value: b.phone?.trim() || "—" },
    { label: "Website", value: b.website?.trim() || "—" },
    { label: "Description", value: b.description?.trim() || "—" },
    { label: "Street", value: effectiveStreet },
    { label: "City", value: effectiveCity },
    { label: "State", value: effectiveState },
    { label: "ZIP", value: effectiveZip },
  ];
}

function toReadableErrorMessage(input: unknown, fallback: string): string {
  const message =
    input instanceof Error ? input.message : typeof input === "string" ? input : "";
  if (!message) return fallback;
  if (message.includes("GraphQL transport error")) {
    if (message.toLowerCase().includes("unauthorized")) {
      return "You do not have permission to perform this action.";
    }
    return fallback;
  }
  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

function readableVerificationFileName(storageKey: string): string {
  const leaf = storageKey.split("/").pop() || storageKey;
  return leaf.replace(/^\d+-/, "");
}

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

async function fetchBusinessIdForReview(reviewId: string): Promise<string | null> {
  try {
    const row = await withDataAuthModeMutation<{ businessId?: string | null }>(
      "Review.get",
      (authMode) => amplifyDataClient.models.Review.get({ id: reviewId }, { authMode })
    );
    return row?.businessId ?? null;
  } catch {
    return null;
  }
}

async function loadActivityFromNotifications(): Promise<ActivityRow[]> {
  const { data } = await withDataAuthModeFallback<Record<string, unknown>>(
    "AdminNotification.activity",
    (authMode) =>
      (amplifyDataClient.models as any).AdminNotification.list(
        { filter: { type: { eq: "ADMIN_ACTIVITY" } }, limit: 100 },
        { authMode }
      )
  );

  return data
    .map((row): ActivityRow => {
      const rawMessage = typeof row.message === "string" ? row.message : "{}";
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(rawMessage) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      return {
        id: String(row.id ?? ""),
        action: String(parsed.action ?? row.title ?? ""),
        targetType: parsed.targetType != null ? String(parsed.targetType) : undefined,
        targetId: parsed.targetId != null ? String(parsed.targetId) : undefined,
        createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
      };
    })
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 25);
}
