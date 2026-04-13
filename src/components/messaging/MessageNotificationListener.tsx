import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";
import { amplifyDataClient } from "@/amplifyDataClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UPLIFT_REFRESH_CONVERSATIONS_EVENT } from "@/lib/messaging-events";

const POLL_MS = 22_000;
const MAX_TOASTS_PER_TICK = 2;

type ConvRow = {
  id: string;
  lastMessage?: string | null;
  lastMessageTimestamp?: string | null;
  unreadCount?: number | null;
  participantMuted?: boolean | null;
  participantHidden?: boolean | null;
  businessName?: string | null;
};

type RowSnap = { lm: string | null; ts: string | null; unread: number };
type Snapshot = Record<string, RowSnap>;

function getConversationModel() {
  return (amplifyDataClient.models as { Conversation?: { list: (o: unknown) => Promise<{ data?: ConvRow[] }> } })
    .Conversation;
}

/**
 * Polls the conversation list while signed in and surfaces toasts / browser notifications
 * when a thread updates while the user is not actively viewing that chat.
 */
export function MessageNotificationListener() {
  const { user } = useAuth();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let snap: Snapshot | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    const toSnapshot = (rows: ConvRow[]): Snapshot => {
      const s: Snapshot = {};
      for (const row of rows) {
        s[row.id] = {
          lm: row.lastMessage ?? null,
          ts: row.lastMessageTimestamp ?? null,
          unread: row.unreadCount ?? 0,
        };
      }
      return s;
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        await getCurrentUser();
      } catch {
        snap = null;
        return;
      }

      const model = getConversationModel();
      if (!model) return;

      const res = await model.list({ authMode: "userPool" });
      const rows = (res?.data ?? []).filter((c) => !c.participantHidden);
      const nextSnap = toSnapshot(rows);

      const prev = snap;
      if (prev) {
        let shown = 0;
        let anyChange = false;
        for (const row of rows) {
          if (row.participantMuted === true) continue;
          let skipRecentOwnSend = false;
          try {
            const raw = sessionStorage.getItem("uplift:lastOwnMessage");
            if (raw) {
              const j = JSON.parse(raw) as { conversationId?: string; at?: number };
              if (j.conversationId === row.id && typeof j.at === "number" && Date.now() - j.at < 8000) {
                skipRecentOwnSend = true;
              }
            }
          } catch {
            // ignore
          }
          if (skipRecentOwnSend) continue;

          const p = prev[row.id];
          if (!p) continue;
          const changed =
            p.lm !== (row.lastMessage ?? null) ||
            p.ts !== (row.lastMessageTimestamp ?? null) ||
            p.unread !== (row.unreadCount ?? 0);
          if (!changed) continue;
          anyChange = true;

          const threadPath = `/messages/${row.id}`;
          if (pathRef.current === threadPath && typeof document !== "undefined" && !document.hidden) {
            continue;
          }

          if (shown >= MAX_TOASTS_PER_TICK) continue;
          shown += 1;
          const title = row.businessName || "New message";
          const body =
            (row.lastMessage && String(row.lastMessage).slice(0, 140)) || "You have a new message";
          toast.info(title, { description: body, duration: 6500 });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification(title, { body, tag: `uplift-msg-${row.id}` });
            } catch {
              // ignore
            }
          }
        }
        if (anyChange) {
          window.dispatchEvent(new Event(UPLIFT_REFRESH_CONVERSATIONS_EVENT));
        }
      }

      snap = nextSnap;
    };

    void tick().then(() => {
      if (!cancelled) {
        timer = setInterval(() => void tick(), POLL_MS);
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [user?.userId]);

  return null;
}
