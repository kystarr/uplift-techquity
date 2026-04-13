import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/hooks/useMessages";
import { DeleteConversationForMeDialog } from "@/components/messaging/DeleteConversationForMeDialog";
import { ConversationChatMenu } from "@/components/messaging/ConversationChatMenu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { requestDesktopMessageNotifications } from "@/lib/messaging-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { getConversationCounterparty, getViewerUnreadCount } from "@/lib/messaging-counterparty";

const MessagesInbox = () => {
  const navigate = useNavigate();
  const { user, isBusiness } = useAuth();
  const { backendRow } = useOwnerBusiness();
  const ownBusinessId = backendRow?.id ?? null;
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [muteBusyId, setMuteBusyId] = useState<string | null>(null);
  const [desktopNotifBusy, setDesktopNotifBusy] = useState(false);
  const {
    conversations,
    loading,
    error,
    hideConversationForMe,
    setConversationMuted,
  } = useMessages();

  const showDesktopNotifPrompt =
    typeof Notification !== "undefined" && Notification.permission === "default";

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!user) return conversations;
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const { title } = getConversationCounterparty(conv, {
        userId: user.userId,
        isBusiness,
        ownBusinessId,
      });
      const preview = (conv.lastMessage ?? "").toLowerCase();
      return (
        title.toLowerCase().includes(q) ||
        preview.includes(q)
      );
    });
  }, [conversations, searchQuery, user, isBusiness, ownBusinessId]);

  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return formatDistanceToNow(d, { addSuffix: true });
  };

  const handleConversationClick = (conversationId: string) => {
    navigate(`/messages/${conversationId}`);
  };

  return (
    <div className="bg-background">
      <DeleteConversationForMeDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        pending={deletePending}
        onConfirm={async () => {
          if (!deleteTargetId) return;
          setDeletePending(true);
          try {
            await hideConversationForMe(deleteTargetId);
          } catch (err) {
            toast.error("Couldn't remove chat", {
              description: err instanceof Error ? err.message : undefined,
            });
            throw err;
          } finally {
            setDeletePending(false);
          }
        }}
      />

      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
            <p className="text-muted-foreground">
              {isBusiness
                ? "Reply to customers who messaged your business."
                : "Chat with businesses you're interested in."}
            </p>
            {typeof Notification !== "undefined" && Notification.permission === "granted" && (
              <p className="text-xs text-muted-foreground mt-2">Desktop notifications are enabled.</p>
            )}
          </div>
          {showDesktopNotifPrompt && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start"
              disabled={desktopNotifBusy}
              onClick={async () => {
                setDesktopNotifBusy(true);
                try {
                  const p = await requestDesktopMessageNotifications();
                  if (p === "granted") {
                    toast.success("Desktop notifications enabled");
                  } else if (p === "denied") {
                    toast.error("Notifications are blocked in your browser settings.");
                  }
                } finally {
                  setDesktopNotifBusy(false);
                }
              }}
            >
              {desktopNotifBusy ? "Requesting…" : "Enable desktop alerts"}
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Conversations List */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded">
                Error loading conversations: {error.message}
              </div>
            )}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading conversations...</p>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => {
                const counterparty =
                  user != null
                    ? getConversationCounterparty(conversation, {
                        userId: user.userId,
                        isBusiness,
                        ownBusinessId,
                      })
                    : { title: conversation.businessName || "Conversation", image: conversation.businessImage ?? null };
                const timeLabel = formatRelativeTime(conversation.lastMessageTimestamp);
                const viewerUnread =
                  user != null
                    ? getViewerUnreadCount(conversation, {
                        userId: user.userId,
                        isBusiness,
                        ownBusinessId,
                      })
                    : 0;
                const isUnread = viewerUnread > 0;
                return (
                <div
                  key={conversation.id}
                  className={`relative rounded-lg border border-border transition-all hover:shadow-md ${
                    isUnread
                      ? "border-l-4 border-l-primary bg-primary/5 shadow-sm"
                      : "bg-card hover:bg-accent/50"
                  }`}
                >
                  <div className="absolute right-1 top-1 z-10">
                    <ConversationChatMenu
                      openable
                      participantMuted={conversation.participantMuted}
                      muteBusy={muteBusyId === conversation.id}
                      onToggleMute={async () => {
                        try {
                          setMuteBusyId(conversation.id);
                          await setConversationMuted(conversation.id, !conversation.participantMuted);
                          toast.success(
                            conversation.participantMuted
                              ? "Conversation unmuted"
                              : "Conversation muted — alerts paused for this chat"
                          );
                        } catch (e) {
                          toast.error("Could not update mute", {
                            description: e instanceof Error ? e.message : undefined,
                          });
                        } finally {
                          setMuteBusyId(null);
                        }
                      }}
                      onRequestDelete={() => setDeleteTargetId(conversation.id)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConversationClick(conversation.id)}
                    className="flex w-full min-w-0 items-start gap-4 p-4 pr-14 pt-10 text-left hover:bg-accent/30 sm:pt-4"
                  >
                    <div
                      className={`relative shrink-0 ${isUnread ? "ring-2 ring-primary/35 ring-offset-2 ring-offset-background rounded-full" : ""}`}
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage
                          src={counterparty.image || undefined}
                          alt={counterparty.title}
                        />
                        <AvatarFallback>{(counterparty.title || "C")[0]}</AvatarFallback>
                      </Avatar>
                      {isUnread && (
                        <span
                          className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-primary shadow-sm"
                          title="Unread messages"
                          aria-hidden
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="mb-1 flex items-center gap-2">
                        <h3
                          className={`truncate ${
                            isUnread
                              ? "text-base font-bold text-foreground"
                              : "text-base font-semibold text-foreground"
                          }`}
                        >
                          {counterparty.title}
                        </h3>
                      </div>

                      <p
                        className={`truncate text-sm leading-snug ${
                          isUnread
                            ? "font-bold text-foreground"
                            : "font-normal text-muted-foreground"
                        }`}
                      >
                        {conversation.lastMessage?.trim() ||
                          (conversation.lastMessageTimestamp
                            ? "Attachment or media"
                            : "No messages yet")}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
                      {timeLabel ? (
                        <span
                          className={`text-xs ${
                            isUnread ? "font-semibold text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {timeLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-50">—</span>
                      )}
                      {viewerUnread > 0 && (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          {viewerUnread > 99 ? "99+" : viewerUnread}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No conversations found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MessagesInbox;
