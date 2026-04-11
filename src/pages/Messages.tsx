import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { useMessages } from "@/hooks/useMessages";
import { useAuthenticator } from "@aws-amplify/ui-react";

const Messages = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuthenticator();
  const { messages, loading, error, sendMessage, fetchMessages, conversations } = useMessages();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Find the current conversation
  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  const handleSend = async () => {
    if (!messageText.trim() || !conversationId || sending) return;

    try {
      setSending(true);
      await sendMessage(conversationId, messageText.trim());
      setMessageText("");
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId || sending) return;

    try {
      setSending(true);
      const url = URL.createObjectURL(file);
      const attachmentType = file.type.startsWith("image/") ? "image" : "file";
      await sendMessage(conversationId, "", {
        type: attachmentType,
        url,
        name: file.name,
      });
    } catch (err) {
      console.error('Failed to upload file:', err);
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />
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
              <div className="text-muted-foreground">Loading conversation...</div>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          {error && (
            <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded">
              Error loading messages: {error.message}
            </div>
          )}
          <div className="space-y-4">
            {loading ? (
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
              disabled={sending || !conversationId}
              className="flex-1"
            />

            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sending || !conversationId}
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
