import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminFlags } from "@/hooks/useAdminFlags";
import { useAdminModeration } from "@/hooks/useAdminModeration";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { amplifyDataClient } from "@/amplifyDataClient";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface HiddenQueueRow {
  reviewId: string;
  businessId: string;
  businessName?: string;
  text?: string;
}

interface PendingBizRow {
  businessId: string;
  businessName?: string;
  contactEmail?: string;
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
    adminRemoveBusiness,
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
  const [removeBusinessId, setRemoveBusinessId] = useState("");

  const loadQueues = async () => {
    setHiddenLoading(true);
    setPendingLoading(true);
    setActivityLoading(true);
    try {
      const [h, p, a] = await Promise.all([
        amplifyDataClient.queries.listHiddenReviewsForAdmin({}, { authMode: "userPool" }),
        amplifyDataClient.queries.listPendingBusinessVerifications({}, { authMode: "userPool" }),
        amplifyDataClient.queries.listAdminActivityLog({}, { authMode: "userPool" }),
      ]);
      setHidden((Array.isArray(h.data) ? h.data : []) as HiddenQueueRow[]);
      setPendingBiz((Array.isArray(p.data) ? p.data : []) as PendingBizRow[]);
      setActivity((Array.isArray(a.data) ? a.data : []) as ActivityRow[]);
    } catch {
      toast.error("Failed to load admin queues");
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

      <Tabs defaultValue="flags" className="w-full">
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
                        } catch {
                          toast.error("Failed");
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
                          } catch {
                            toast.error("Remove failed");
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
                      } catch {
                        toast.error("Failed");
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
                      } catch {
                        toast.error("Failed");
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
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                  {JSON.stringify(
                    {
                      pendingBusinessName: b.pendingBusinessName,
                      pendingStreet: b.pendingStreet,
                      pendingCity: b.pendingCity,
                      pendingState: b.pendingState,
                      pendingZip: b.pendingZip,
                      docs: b.verificationDocumentKeys,
                    },
                    null,
                    2
                  )}
                </pre>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        await adminResolveBusinessVerification(b.businessId, "APPROVE");
                        toast.success("Approved");
                        await loadQueues();
                      } catch {
                        toast.error("Failed");
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
                      } catch {
                        toast.error("Failed");
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
                } catch {
                  toast.error("Failed");
                }
              }}
            >
              Remove user
            </Button>
          </div>
          <div className="space-y-2">
            <LabelledInput
              label="Remove business by id"
              value={removeBusinessId}
              onChange={setRemoveBusinessId}
              placeholder="business uuid"
            />
            <Button
              type="button"
              variant="destructive"
              disabled={actionLoading || !removeBusinessId.trim()}
              onClick={async () => {
                try {
                  await adminRemoveBusiness(removeBusinessId.trim());
                  toast.success("Business removed");
                  setRemoveBusinessId("");
                  await loadQueues();
                } catch {
                  toast.error("Failed");
                }
              }}
            >
              Remove business
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
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
    const res = await amplifyDataClient.models.Review.get(
      { id: reviewId },
      { authMode: "userPool" }
    );
    const data = res.data as { businessId?: string | null } | null;
    return data?.businessId ?? null;
  } catch {
    return null;
  }
}
