import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Search, Star, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { EmptyState } from "@/components/shared";
import { useAuth } from "@/contexts/AuthContext";
import { loadMessagingStore } from "@/lib/messaging/storage";
import type { MessageThread } from "@/types/messaging";

function lastPreview(thread: MessageThread): string {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return "No messages yet";
  if (last.attachment && !last.text) {
    return last.attachment.type === "image" ? "Photo" : `File: ${last.attachment.name}`;
  }
  return last.text || "Message";
}

function isUnreadForCustomer(thread: MessageThread): boolean {
  const last = thread.messages[thread.messages.length - 1];
  return last?.sender === "business";
}

const MessagesInbox = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user!.userId;
  const [searchQuery, setSearchQuery] = useState("");

  const threads = useMemo(() => {
    const store = loadMessagingStore(userId);
    return Object.values(store.threads).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [userId]);

  const filteredThreads = threads.filter((t) =>
    t.business.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${Math.max(0, diffInMinutes)}m ago`;
    }
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Chat with businesses you have contacted. Messages are saved on this device until a server
            inbox is connected.
          </p>
        </div>

        {threads.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Search for a business and tap “Message owner” to start a thread."
            action={
              <Button asChild>
                <Link to="/search">Discover businesses</Link>
              </Button>
            }
            className="py-16"
          />
        ) : (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-2">
                {filteredThreads.length > 0 ? (
                  filteredThreads.map((thread) => {
                    const unread = isUnreadForCustomer(thread);
                    return (
                      <button
                        key={thread.businessId}
                        type="button"
                        onClick={() =>
                          navigate(`/messages/${thread.businessId}`, {
                            state: {
                              business: {
                                id: thread.businessId,
                                name: thread.business.name,
                                category: "",
                                rating: thread.business.rating,
                                reviewCount: thread.business.reviewCount,
                                distance: thread.business.distance,
                                image: thread.business.image,
                                tags: [],
                                verified: thread.business.verified,
                              },
                            },
                          })
                        }
                        className={`w-full p-4 rounded-lg border transition-all hover:shadow-md text-left ${
                          unread
                            ? "bg-primary/5 border-primary/20"
                            : "bg-card border-border hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14 shrink-0">
                            <AvatarImage src={thread.business.image} alt="" />
                            <AvatarFallback>{thread.business.name[0] ?? "?"}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate text-foreground">
                                {thread.business.name}
                              </h3>
                              {thread.business.verified && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  Verified
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-secondary text-secondary" />
                                <span>{thread.business.rating.toFixed(1)}</span>
                              </div>
                              {thread.business.distance != null && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{thread.business.distance}</span>
                                </div>
                              )}
                            </div>

                            <p
                              className={`text-sm truncate ${
                                unread ? "font-medium text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {lastPreview(thread)}
                            </p>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(new Date(thread.updatedAt))}
                            </span>
                            {unread && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No conversations match your search</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesInbox;
