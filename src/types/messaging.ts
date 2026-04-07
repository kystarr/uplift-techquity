export type MessageSender = "customer" | "business";

/** One chat line; persisted to localStorage (attachment URLs omit ephemeral blob:). */
export interface ThreadMessage {
  id: string;
  text: string;
  sender: MessageSender;
  createdAt: string;
  attachment?: {
    type: "image" | "file";
    name: string;
    /** Present when durable (https); omitted for blob previews. */
    url?: string;
  };
}

export interface BusinessThreadSnapshot {
  name: string;
  image?: string;
  rating: number;
  reviewCount?: number;
  distance?: string;
  verified: boolean;
}

export interface MessageThread {
  businessId: string;
  business: BusinessThreadSnapshot;
  messages: ThreadMessage[];
  updatedAt: string;
}

export interface MessagingStore {
  v: 1;
  threads: Record<string, MessageThread>;
}
