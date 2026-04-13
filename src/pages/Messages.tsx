import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigation } from "@/components/Navigation";
import { useMessages, MESSAGES_DRAFT_SEGMENT } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
  const { user } = useAuth();
  const {
    messages,
    loading,
    error,
    sendMessage,
    fetchMessages,
    createConversation,
    conversations,
    resetThreadView,
    hideConversationForMe,
    setConversationMuted,
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
      participantMuted: false,
    };
  }, [conversations, conversationId, navState, user?.userId]);

  useEffect(() => {
    if (!conversationId) return;
    if (conversationId === MESSAGES_DRAFT_SEGMENT) {
      resetThreadView();
      return;
    }
    fetchMessages(conversationId);
  }, [conversationId, fetchMessages, resetThreadView]);

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

  const canOpenThreadMenu =
    Boolean(conversationId) &&
    conversationId !== MESSAGES_DRAFT_SEGMENT &&
    Boolean(conversation);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <Navigation />
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
      {/* Header with Business Info */}
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
                  <AvatarImage src={conversation.businessImage || undefined} alt={conversation.businessName || 'Business'} />
                  <AvatarFallback>{(conversation.businessName || 'B')[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-foreground truncate">
                      {conversation.businessName || 'Business'}
                    </h2>
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
            {loading && conversationId !== MESSAGES_DRAFT_SEGMENT ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground">No messages yet. Start the conversation!</div>
            ) : (
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
