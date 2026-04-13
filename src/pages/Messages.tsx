import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessages, MESSAGES_DRAFT_SEGMENT } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { getConversationCounterparty, getViewerUnreadCount } from "@/lib/messaging-counterparty";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { DeleteConversationForMeDialog } from "@/components/messaging/DeleteConversationForMeDialog";
import { ConversationChatMenu } from "@/components/messaging/ConversationChatMenu";

/** Passed from BusinessProfile when starting a thread so the header works before the inbox refetches. */
export type MessagesLocationState = {
  businessName?: string;
  businessImage?: string;
  businessId?: string;
};

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, isBusiness } = useAuth();
  const { backendRow } = useOwnerBusiness();
  const ownBusinessId = backendRow?.id ?? null;
  const {
    messages,
    messagesLoading,
    error,
    sendMessage,
    fetchMessages,
    createConversation,
    conversations,
    resetThreadView,
    hideConversationForMe,
    setConversationMuted,
    markConversationAsRead,
  } = useMessages();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [muteBusy, setMuteBusy] = useState(false);

  const navState = (location.state ?? null) as MessagesLocationState | null;

  const conversation = useMemo(() => {
    if (conversationId === MESSAGES_DRAFT_SEGMENT) {
      if (!navState?.businessId || !navState?.businessName) return undefined;
      return {
        id: MESSAGES_DRAFT_SEGMENT,
        participantId: user?.userId ?? "",
        businessId: navState.businessId,
        businessName: navState.businessName,
        businessImage: navState.businessImage ?? null,
        lastMessage: null as string | null,
        lastMessageTimestamp: null as string | null,
        unreadCount: 0,
        businessUnreadCount: 0,
        participantMuted: false,
      };
    }
    const fromList = conversations.find((c) => c.id === conversationId);
    if (fromList) return fromList;
    if (!conversationId || !navState?.businessName) return undefined;
    return {
      id: conversationId,
      participantId: user?.userId ?? "",
      businessId: navState.businessId ?? "",
      businessName: navState.businessName,
      businessImage: navState.businessImage ?? null,
      lastMessage: null as string | null,
      lastMessageTimestamp: null as string | null,
      unreadCount: 0,
      businessUnreadCount: 0,
      participantMuted: false,
    };
  }, [conversations, conversationId, navState, user?.userId]);

  const viewerUnread = useMemo(() => {
    if (!conversation || !user) return 0;
    return getViewerUnreadCount(conversation, {
      userId: user.userId,
      isBusiness,
      ownBusinessId,
    });
  }, [conversation, user, isBusiness, ownBusinessId]);

  const counterparty = useMemo(() => {
    if (!conversation || !user) return null;
    const viewer = { userId: user.userId, isBusiness, ownBusinessId };
    const base = getConversationCounterparty(conversation, viewer);
    const isOwnerViewingCustomer =
      user.userId !== conversation.participantId &&
      isBusiness &&
      ownBusinessId &&
      conversation.businessId === ownBusinessId;
    if (isOwnerViewingCustomer && !conversation.participantName?.trim()) {
      const fromMsg = messages
        .find((m) => m.senderId === conversation.participantId)
        ?.senderName?.trim();
      if (fromMsg) return { ...base, title: fromMsg };
    }
    const isCustomerViewingBusiness = user.userId === conversation.participantId;
    if (isCustomerViewingBusiness && !conversation.businessName?.trim()) {
      const fromMsg = messages
        .find((m) => m.senderId !== conversation.participantId)
        ?.senderName?.trim();
      if (fromMsg) return { ...base, title: fromMsg };
    }
    return base;
  }, [conversation, user, isBusiness, ownBusinessId, messages]);

  useEffect(() => {
    if (!conversationId) return;
    if (conversationId === MESSAGES_DRAFT_SEGMENT) {
      resetThreadView();
      return;
    }
    fetchMessages(conversationId);
  }, [conversationId, fetchMessages, resetThreadView]);

  useEffect(() => {
    if (!conversationId || conversationId === MESSAGES_DRAFT_SEGMENT) return;
    void markConversationAsRead(conversationId);
  }, [conversationId, markConversationAsRead]);

  const handleSend = async () => {
    if (!messageText.trim() || !conversationId || sending) return;

    try {
      setSending(true);
      let activeId = conversationId;
      if (conversationId === MESSAGES_DRAFT_SEGMENT) {
        if (!navState?.businessId || !navState?.businessName) {
          toast.error("Missing business info", {
            description: "Go back to the business profile and tap Message again.",
          });
          return;
        }
        activeId = await createConversation(
          navState.businessId,
          navState.businessName,
          navState.businessImage ?? undefined
        );
      }
      await sendMessage(activeId, messageText.trim());
      if (conversationId === MESSAGES_DRAFT_SEGMENT && navState) {
        navigate(`/messages/${activeId}`, {
          replace: true,
          state: {
            businessId: navState.businessId,
            businessName: navState.businessName,
            businessImage: navState.businessImage,
          },
        });
      }
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Could not send message", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId || sending) return;

    try {
      setSending(true);
      let activeId = conversationId;
      if (conversationId === MESSAGES_DRAFT_SEGMENT) {
        if (!navState?.businessId || !navState?.businessName) {
          toast.error("Missing business info", {
            description: "Go back to the business profile and tap Message again.",
          });
          return;
        }
        activeId = await createConversation(
          navState.businessId,
          navState.businessName,
          navState.businessImage ?? undefined
        );
      }
      const url = URL.createObjectURL(file);
      const attachmentType = file.type.startsWith("image/") ? "image" : "file";
      await sendMessage(activeId, "", {
        type: attachmentType,
        url,
        name: file.name,
      });
      if (conversationId === MESSAGES_DRAFT_SEGMENT && navState) {
        navigate(`/messages/${activeId}`, {
          replace: true,
          state: {
            businessId: navState.businessId,
            businessName: navState.businessName,
            businessImage: navState.businessImage,
          },
        });
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
      toast.error("Could not send attachment", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatMessageAge = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return formatDistanceToNow(d, { addSuffix: true });
  };

  const canOpenThreadMenu =
    Boolean(conversationId) &&
    conversationId !== MESSAGES_DRAFT_SEGMENT &&
    Boolean(conversation);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden bg-background">
      <DeleteConversationForMeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pending={deletePending}
        onConfirm={async () => {
          if (!conversationId || conversationId === MESSAGES_DRAFT_SEGMENT) return;
          setDeletePending(true);
          try {
            await hideConversationForMe(conversationId);
            navigate("/messages");
          } catch (err) {
            toast.error("Couldn't remove chat", {
              description: err instanceof Error ? err.message : undefined,
            });
            throw err; // Dialog stays open (see DeleteConversationForMeDialog).
          } finally {
            setDeletePending(false);
          }
        }}
      />
      {/* Header: customer sees business; business owner sees customer */}
      <div className="border-b border-border bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {!conversation ? (
              <div className="text-muted-foreground">
                {conversationId === MESSAGES_DRAFT_SEGMENT
                  ? "Open Message from a business profile to start chatting."
                  : "Loading conversation..."}
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage
                    src={counterparty?.image || undefined}
                    alt={counterparty?.title || "Chat"}
                  />
                  <AvatarFallback>{(counterparty?.title || "C")[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-semibold text-foreground truncate">
                      {counterparty?.title || "Chat"}
                    </h2>
                    {viewerUnread > 0 && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                        Unread
                      </span>
                    )}
                  </div>
                </div>
                {canOpenThreadMenu && (
                  <ConversationChatMenu
                    openable
                    participantMuted={conversation.participantMuted}
                    muteBusy={muteBusy}
                    onToggleMute={async () => {
                      if (!conversationId || conversationId === MESSAGES_DRAFT_SEGMENT) return;
                      try {
                        setMuteBusy(true);
                        await setConversationMuted(conversationId, !conversation.participantMuted);
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
                        setMuteBusy(false);
                      }
                    }}
                    onRequestDelete={() => setDeleteOpen(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded">
              Error loading messages: {error.message}
            </div>
          )}
          <div className="space-y-4">
            {messagesLoading && conversationId !== MESSAGES_DRAFT_SEGMENT ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : messages.length > 0 ? (
              messages.map((message) => {
                const isOwnMessage = message.senderId === user?.userId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isOwnMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      } rounded-2xl px-4 py-2.5 shadow-sm`}
                    >
                      {message.attachmentUrl && (
                        <div className="mb-2">
                          {message.attachmentType === "image" ? (
                            <img
                              src={message.attachmentUrl}
                              alt="Attachment"
                              className="rounded-lg max-w-full h-auto"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                              <Paperclip className="h-4 w-4" />
                              <span className="text-sm">{message.attachmentName}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {message.text && <p className="text-sm leading-relaxed">{message.text}</p>}
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : conversation &&
              conversationId !== MESSAGES_DRAFT_SEGMENT &&
              (conversation.lastMessage?.trim() || conversation.lastMessageTimestamp) ? (
              <div
                className={`mx-auto max-w-md rounded-lg border p-6 text-left ${
                  viewerUnread > 0
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-border bg-muted/40"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  {viewerUnread > 0 && (
                    <span
                      className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary shadow-sm ring-2 ring-primary/25"
                      aria-hidden
                    />
                  )}
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      viewerUnread > 0
                        ? "font-bold text-primary"
                        : "font-medium text-muted-foreground"
                    }`}
                  >
                    {viewerUnread > 0 ? "Unread · latest message" : "Latest message"}
                  </p>
                </div>
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    viewerUnread > 0
                      ? "font-bold text-foreground"
                      : "font-normal text-foreground"
                  }`}
                >
                  {conversation.lastMessage?.trim() || "Attachment or media"}
                </p>
                {formatMessageAge(conversation.lastMessageTimestamp) && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last activity {formatMessageAge(conversation.lastMessageTimestamp)}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  The full thread will show here when it finishes loading; you can still send a reply
                  below.
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-end gap-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
              disabled={sending}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={sending}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              disabled={sending || !conversationId || !conversation}
              className="flex-1"
            />

            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sending || !conversationId || !conversation}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
