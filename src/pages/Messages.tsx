import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  text: string;
  sender: "customer" | "business";
  timestamp: Date;
  attachment?: {
    type: "image" | "file";
    url: string;
    name: string;
  };
}

const Messages = () => {
  const navigate = useNavigate();
  const { businessId } = useParams();
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm interested in your services. Are you available next week?",
      sender: "customer",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      text: "Hello! Yes, we have availability on Tuesday and Thursday. What time works best for you?",
      sender: "business",
      timestamp: new Date(Date.now() - 3000000),
    },
    {
      id: "3",
      text: "Tuesday around 2pm would be perfect!",
      sender: "customer",
      timestamp: new Date(Date.now() - 2400000),
    },
  ]);

  // Mock business data
  const business = {
    name: "Essence Hair Studio",
    rating: 4.8,
    reviewCount: 124,
    distance: "1.2 mi",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
    verified: true,
  };

  const handleSend = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: "customer",
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessageText("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: "",
      sender: "customer",
      timestamp: new Date(),
      attachment: {
        type: file.type.startsWith("image/") ? "image" : "file",
        url: URL.createObjectURL(file),
        name: file.name,
      },
    };

    setMessages([...messages, newMessage]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
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

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={business.image} alt={business.name} />
                <AvatarFallback>{business.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-foreground truncate">
                    {business.name}
                  </h2>
                  {business.verified && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                    <span className="font-medium">{business.rating}</span>
                    <span>({business.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{business.distance}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="container max-w-4xl mx-auto px-4 py-6">
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
                      {message.attachment.type === "image" ? (
                        <img
                          src={message.attachment.url}
                          alt="Attachment"
                          className="rounded-lg max-w-full h-auto"
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm">{message.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {message.text && <p className="text-sm leading-relaxed">{message.text}</p>}
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "customer"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
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
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById("file-upload")?.click()}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />

            <Button
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
  );
};

export default Messages;
