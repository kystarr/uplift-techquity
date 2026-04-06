import { useCallback, useRef, useState } from "react";
import type { ChatSession } from "@google/generative-ai";
import { Bot, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createUpliftChatSession, isGeminiConfigured, sendUpliftMessage } from "@/lib/gemini-chat";

type UiMessage = { role: "user" | "assistant"; text: string };

const SUGGESTED_PROMPTS = [
  "How do I find businesses near me?",
  "What does verified mean here?",
  "How can a business join Uplift?",
] as const;

/**
 * Floating assistant: FAB opens a compact side card (not full-height). Gemini runs in the
 * browser via `VITE_GEMINI_API_KEY` (dev / prototypes only — use a server proxy before production).
 */
export function UpliftChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sending, setSending] = useState(false);
  const chatRef = useRef<ChatSession | null>(null);

  const configured = isGeminiConfigured();

  const resetConversation = useCallback(() => {
    chatRef.current = null;
    setMessages([]);
  }, []);

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      if (!configured) {
        toast.error("Add VITE_GEMINI_API_KEY to your .env file to enable the assistant.");
        return;
      }

      setMessages((prev) => [...prev, { role: "user", text }]);
      setInput("");
      setSending(true);

      try {
        if (!chatRef.current) {
          chatRef.current = createUpliftChatSession();
        }
        const reply = await sendUpliftMessage(chatRef.current, text);
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        toast.error("Assistant could not reply", { description: msg });
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setSending(false);
      }
    },
    [configured, sending],
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
            /* Floating card — same corner as the FAB (FAB is hidden while open) */
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
                  Ask how to use the app or get ideas for supporting minority-owned businesses.
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

          {!configured && (
            <p className="border-b border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              Set <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">VITE_GEMINI_API_KEY</code> in{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">.env</code> and restart{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">npm run dev</code>. Use a backend
              proxy before shipping to production.
            </p>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Try one of the suggestions below, or type your own question.
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
                    disabled={sending || !configured}
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
                disabled={sending || !configured}
                className="min-w-0 flex-1 rounded-full border-border bg-muted/80"
                aria-label="Message to assistant"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim() || !configured}
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
