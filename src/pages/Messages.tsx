import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  appendCustomerMessage,
  loadMessagingStore,
  saveMessagingStore,
} from "@/lib/messaging/storage";
import { snapshotForBusinessId, toThreadSnapshot } from "@/lib/businessCatalog";
import type { BusinessSummaryData } from "@/types/business";
import type { BusinessThreadSnapshot, ThreadMessage } from "@/types/messaging";

type LocationState = { business?: BusinessSummaryData } | undefined;

type MessagingStore = ReturnType<typeof loadMessagingStore>;

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { businessId } = useParams();
  const { user } = useAuth();
  const userId = user!.userId;

  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);

  const businessSnapshot = useMemo(() => {
    const fromNav = (location.state as LocationState)?.business;
    if (fromNav && businessId && fromNav.id === businessId) {
      return toThreadSnapshot(fromNav);
    }
    return snapshotForBusinessId(businessId ?? "");
  }, [location.state, businessId]);

  const reloadMessages = useCallback(() => {
    if (!businessId) return;
    const store = loadMessagingStore(userId);
    setMessages(store.threads[businessId]?.messages ?? []);
  }, [userId, businessId]);

  useEffect(() => {
    reloadMessages();
  }, [reloadMessages]);

  const persistAndSyncMessages = useCallback(
    (mutate: (store: MessagingStore, snapshot: BusinessThreadSnapshot) => MessagingStore): MessagingStore | null => {
      if (!businessId) return null;
      const prev = loadMessagingStore(userId);
      const next = mutate(prev, businessSnapshot);
      saveMessagingStore(userId, next);
      setMessages(next.threads[businessId]?.messages ?? []);
      return next;
    },
    [userId, businessId, businessSnapshot]
  );

  const handleSend = () => {
    if (!businessId) return;
    const text = messageText.trim();
    if (!text) return;

    persistAndSyncMessages((store, snapshot) =>
      appendCustomerMessage(store, businessId, snapshot, text)
    );
    setMessageText("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !businessId) return;

    const type = file.type.startsWith("image/") ? "image" : "file";
    const previewUrl = URL.createObjectURL(file);

    const nextStore = persistAndSyncMessages((store, snapshot) =>
      appendCustomerMessage(store, businessId, snapshot, "", {
        type,
        name: file.name,
      })
    );
    if (!nextStore) return;
    const list = nextStore.threads[businessId]?.messages ?? [];
    const last = list[list.length - 1];
    if (!last) return;
    setMessages([
      ...list.slice(0, -1),
      {
        ...last,
        attachment: {
          type,
          name: file.name,
          url: previewUrl,
        },
      },
    ]);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!businessId) {
    return null;
  }

  const business = businessSnapshot;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <div className="flex flex-col flex-1 min-h-0">
        <div className="border-b border-border bg-card shrink-0">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/messages")}
                className="shrink-0"
                aria-label="Back to inbox"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={business.image} alt="" />
                  <AvatarFallback>{business.name[0] ?? "?"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-foreground truncate">{business.name}</h2>
                    {business.verified && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                      <span className="font-medium">{business.rating.toFixed(1)}</span>
                      {business.reviewCount != null && (
                        <span>({business.reviewCount})</span>
                      )}
                    </div>
                    {business.distance != null && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{business.distance}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="container max-w-4xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
                Start the conversation—ask about hours, services, or availability. The business owner
                will see your message when messaging is connected on their side.
              </p>
            ) : null}
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "customer" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] ${
                      message.sender === "customer"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    } rounded-2xl px-4 py-2.5 shadow-sm`}
                  >
                    {message.attachment && (
                      <div className="mb-2">
                        {message.attachment.type === "image" && message.attachment.url ? (
                          <img
                            src={message.attachment.url}
                            alt=""
                            className="rounded-lg max-w-full h-auto"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                            <Paperclip className="h-4 w-4 shrink-0" />
                            <span className="text-sm break-all">{message.attachment.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {message.text ? (
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    ) : null}
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === "customer"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card shrink-0">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-end gap-2">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx"
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => document.getElementById("file-upload")?.click()}
                className="shrink-0"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />

              <Button
                type="button"
                onClick={handleSend}
                disabled={!messageText.trim()}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
