import { useCallback, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { sendChatWithAssistantMessage } from "@/lib/chat-assistant";

type UiMessage = { role: "user" | "assistant"; text: string };

const SUGGESTED_PROMPTS = [
  "What businesses are on Uplift in my area?",
  "What does verified mean here?",
  "How can a business join Uplift?",
] as const;

/**
 * Floating assistant: server-side Gemini + live APPROVED businesses snapshot (`chatWithAssistant`).
 */
export function UpliftChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sending, setSending] = useState(false);

  const resetConversation = useCallback(() => {
    setMessages([]);
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
        const reply = await sendChatWithAssistantMessage(text, priorHistory);
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        toast.error("Assistant could not reply", { description: msg });
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setSending(false);
      }
    },
    [messages, sending],
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
                  Answers use live approved listings from Discover (via the backend). Deploy the Amplify sandbox and set the
                  GEMINI_API_KEY secret.
                </SheetDescription>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 self-start px-2 text-xs text-muted-foreground"
                onClick={resetConversation}
              >
                Clear chat
              </Button>
            )}
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Try one of the suggestions below, or ask about businesses and locations on the platform.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user" ? "ml-6 bg-primary/15 text-foreground" : "mr-4 bg-muted text-foreground",
                )}
              >
                {m.text}
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
