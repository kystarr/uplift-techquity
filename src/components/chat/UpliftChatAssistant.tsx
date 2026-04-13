import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, MapPin, Send, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  sendChatWithAssistantMessage,
  type AssistantBusinessCard,
} from "@/lib/chat-assistant";

type UiMessage = {
  role: "user" | "assistant";
  text: string;
  referencedBusinesses?: AssistantBusinessCard[];
};

const SUGGESTED_PROMPTS = [
  "What businesses are on Uplift in my area?",
  "What is the highest rated business in my area?",
  "How can a business join Uplift?",
] as const;

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80";

/**
 * Floating assistant: server-side Gemini + live APPROVED businesses snapshot (`chatWithAssistant`).
 */
export function UpliftChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const resetConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Location not supported", {
        description: "Try typing your city or ZIP in the chat instead.",
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location shared", {
          description: "Nearby-style answers will use this for sorting.",
        });
      },
      () => {
        setLocating(false);
        toast.error("Could not get location", {
          description: "Check browser permissions, or type a city or ZIP in the chat.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  }, []);

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;

      const priorHistory = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      setMessages((prev) => [...prev, { role: "user", text }]);
      setInput("");
      setSending(true);

      try {
        const { reply, referencedBusinesses } = await sendChatWithAssistantMessage(text, priorHistory, {
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: reply, referencedBusinesses },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        toast.error("Assistant could not reply", { description: msg });
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setSending(false);
      }
    },
    [messages, sending, userLocation],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendText(input);
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary-hover",
          open && "hidden",
        )}
        aria-label="Open Uplift assistant"
      >
        <Bot className="h-7 w-7" strokeWidth={1.75} />
      </Button>

      <Sheet modal={false} open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          overlayClassName="bg-transparent pointer-events-none"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0",
            "left-auto top-auto h-[min(31rem,calc(100vh-7rem))] w-[min(22rem,calc(100vw-2rem))]",
            "bottom-5 right-4 sm:right-5 sm:max-w-none",
            "rounded-2xl border border-border shadow-xl",
          )}
        >
          <SheetHeader className="space-y-1 border-b border-border px-4 py-4 text-left">
            <div className="flex items-start gap-3 pr-8">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary-foreground"
                aria-hidden
              >
                <Bot className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base">Uplift assistant</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Share your location or name a city/ZIP for nearby picks.
                </SheetDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant={userLocation ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={locating || sending}
                onClick={() => requestLocation()}
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {locating ? "Locating…" : userLocation ? "Location on" : "Share location"}
              </Button>
              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={resetConversation}
                >
                  Clear chat
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Try a suggestion below, or ask about businesses. For &quot;near me&quot; questions, share location or say
                where you are.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn(
                  "space-y-2",
                  m.role === "user" ? "ml-4" : "mr-1",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-2 bg-primary/15 text-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
                {m.role === "assistant" && m.referencedBusinesses && m.referencedBusinesses.length > 0 && (
                  <div className="space-y-2 pl-0">
                    {m.referencedBusinesses.map((b) => (
                      <Link
                        key={b.id}
                        to={`/business/${b.id}`}
                        className={cn(
                          "flex gap-3 rounded-xl border border-border bg-card p-2.5 text-left shadow-sm",
                          "transition-colors hover:bg-accent/50 hover:border-primary/30",
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img
                            src={b.imageUrl || FALLBACK_IMG}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMG;
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{b.name}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{b.category}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-secondary text-secondary" aria-hidden />
                              {b.rating.toFixed(1)} ({b.reviewCount})
                            </span>
                            {b.verified && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                Verified
                              </Badge>
                            )}
                            {(b.city || b.state) && (
                              <span className="text-[11px]">
                                {[b.city, b.state].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Thinking…
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-border px-4 py-3">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendText(label)}
                    className={cn(
                      "rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-left text-xs font-medium text-foreground",
                      "transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Uplift…"
                disabled={sending}
                className="min-w-0 flex-1 rounded-full border-border bg-muted/80"
                aria-label="Message to assistant"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim()}
                className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover"
                aria-label="Send message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
