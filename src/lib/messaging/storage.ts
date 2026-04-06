import type {
  BusinessThreadSnapshot,
  MessageThread,
  MessagingStore,
  ThreadMessage,
} from "@/types/messaging";

const KEY_PREFIX = "uplift.messaging.v1";

export function messagingStorageKey(userId: string): string {
  return `${KEY_PREFIX}:${userId}`;
}

export function loadMessagingStore(userId: string): MessagingStore {
  try {
    const raw = localStorage.getItem(messagingStorageKey(userId));
    if (!raw) return { v: 1, threads: {} };
    const parsed = JSON.parse(raw) as MessagingStore;
    if (parsed?.v !== 1 || typeof parsed.threads !== "object" || parsed.threads === null) {
      return { v: 1, threads: {} };
    }
    return parsed;
  } catch {
    return { v: 1, threads: {} };
  }
}

export function saveMessagingStore(userId: string, store: MessagingStore): void {
  localStorage.setItem(messagingStorageKey(userId), JSON.stringify(store));
}

function persistableAttachment(
  att?: ThreadMessage["attachment"]
): ThreadMessage["attachment"] | undefined {
  if (!att) return undefined;
  const url =
    att.url && (att.url.startsWith("https://") || att.url.startsWith("http://"))
      ? att.url
      : undefined;
  return { type: att.type, name: att.name, ...(url ? { url } : {}) };
}

function upsertThread(
  store: MessagingStore,
  businessId: string,
  business: BusinessThreadSnapshot,
  mutate: (thread: MessageThread) => MessageThread
): MessagingStore {
  const existing = store.threads[businessId];
  const base: MessageThread =
    existing ??
    ({
      businessId,
      business,
      messages: [],
      updatedAt: new Date().toISOString(),
    } satisfies MessageThread);

  const thread: MessageThread = {
    ...base,
    business: { ...base.business, ...business },
  };
  const next = mutate(thread);
  return {
    ...store,
    threads: {
      ...store.threads,
      [businessId]: {
        ...next,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function appendCustomerMessage(
  store: MessagingStore,
  businessId: string,
  business: BusinessThreadSnapshot,
  text: string,
  attachment?: ThreadMessage["attachment"]
): MessagingStore {
  const persisted = persistableAttachment(attachment);
  return upsertThread(store, businessId, business, (thread) => ({
    ...thread,
    messages: [
      ...thread.messages,
      {
        id: crypto.randomUUID(),
        text,
        sender: "customer",
        createdAt: new Date().toISOString(),
        ...(persisted ? { attachment: persisted } : {}),
      },
    ],
  }));
}
