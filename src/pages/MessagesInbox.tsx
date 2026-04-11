import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { useMessages } from "@/hooks/useMessages";

const MessagesInbox = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { conversations, loading, error, markConversationAsRead } = useMessages();

  const filteredConversations = conversations.filter((conv) =>
    (conv.businessName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return "now";
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleConversationClick = async (conversationId: string) => {
    await markConversationAsRead(conversationId);
    navigate(`/messages/${conversationId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Chat with businesses you're interested in
          </p>
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
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation.id)}
                  className={`w-full p-4 rounded-lg border transition-all hover:shadow-md ${
                    conversation.unreadCount > 0
                      ? "bg-primary/5 border-primary/20"
                      : "bg-card border-border hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 shrink-0">
                      <AvatarImage
                        src={conversation.businessImage || undefined}
                        alt={conversation.businessName || "Business"}
                      />
                      <AvatarFallback>{(conversation.businessName || "B")[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-semibold truncate ${
                            conversation.unreadCount > 0 ? "text-foreground font-bold" : "text-foreground"
                          }`}
                        >
                          {conversation.businessName || "Conversation"}
                        </h3>
                      </div>

                      <p
                        className={`text-sm truncate ${
                          conversation.unreadCount > 0
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {conversation.lastMessage || "No messages yet"}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(conversation.lastMessageTimestamp)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
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
