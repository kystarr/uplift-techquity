import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, MapPin, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Conversation {
  id: string;
  businessId: string;
  businessName: string;
  businessImage: string;
  businessRating: number;
  businessDistance: string;
  verified: boolean;
  lastMessage: string;
  timestamp: Date;
  unread: boolean;
}

const MessagesInbox = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const conversations: Conversation[] = [
    {
      id: "1",
      businessId: "essence-hair",
      businessName: "Essence Hair Studio",
      businessImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
      businessRating: 4.8,
      businessDistance: "1.2 mi",
      verified: true,
      lastMessage: "Tuesday around 2pm would be perfect!",
      timestamp: new Date(Date.now() - 2400000),
      unread: false,
    },
    {
      id: "2",
      businessId: "soul-cafe",
      businessName: "Soul Food Café",
      businessImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
      businessRating: 4.9,
      businessDistance: "0.8 mi",
      verified: true,
      lastMessage: "We'd love to cater your event! Let me send you our menu options.",
      timestamp: new Date(Date.now() - 7200000),
      unread: true,
    },
    {
      id: "3",
      businessId: "wellness-spa",
      businessName: "Serenity Wellness Spa",
      businessImage: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400",
      businessRating: 4.7,
      businessDistance: "2.1 mi",
      verified: false,
      lastMessage: "Thank you for your interest! Our massage packages start at $85.",
      timestamp: new Date(Date.now() - 86400000),
      unread: false,
    },
    {
      id: "4",
      businessId: "creative-studio",
      businessName: "Urban Canvas Art Studio",
      businessImage: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400",
      businessRating: 4.6,
      businessDistance: "3.5 mi",
      verified: true,
      lastMessage: "Classes are every Saturday at 10am. Would you like to reserve a spot?",
      timestamp: new Date(Date.now() - 172800000),
      unread: true,
    },
  ];

  const filteredConversations = conversations.filter((conv) =>
    conv.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (date: Date) => {
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

  return (
    <div className="bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6 glass-panel rounded-2xl p-6">
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
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => navigate(`/messages/${conversation.businessId}`)}
                  className={`w-full p-5 rounded-2xl border border-white/30 backdrop-blur-[var(--blur-glass)] transition-smooth hover:-translate-y-0.5 ${
                    conversation.unread
                      ? "bg-primary-light/60 border-primary/35"
                      : "bg-glass hover:bg-white/45 dark:hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 shrink-0">
                      <AvatarImage
                        src={conversation.businessImage}
                        alt={conversation.businessName}
                      />
                      <AvatarFallback>{conversation.businessName[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-semibold truncate ${
                            conversation.unread ? "text-foreground" : "text-foreground"
                          }`}
                        >
                          {conversation.businessName}
                        </h3>
                        {conversation.verified && (
                          <Badge className="shrink-0 bg-success text-success-foreground border-0 p-1.5" aria-label="Verified business">
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-secondary text-secondary" />
                          <span>{conversation.businessRating}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span className="text-primary">{conversation.businessDistance}</span>
                        </div>
                      </div>

                      <p
                        className={`text-sm truncate ${
                          conversation.unread
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {conversation.lastMessage}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                      {conversation.unread && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
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
