/**
 * Who to show in thread/inbox headers: customer sees the business; business owner sees the customer.
 */
export type ConversationCounterpartyInput = {
  participantId: string;
  businessId: string;
  businessName?: string | null;
  businessImage?: string | null;
  participantName?: string | null;
  participantAvatarUrl?: string | null;
};

export type ConversationViewerContext = {
  userId: string;
  isBusiness: boolean;
  /** Amplify `Business.id` for the signed-in owner, when `isBusiness`. */
  ownBusinessId: string | null;
};

export type CounterpartyDisplay = {
  title: string;
  image: string | null;
};

/** Unread count for the signed-in viewer (customer vs business owner use different fields). */
export type ConversationUnreadInput = ConversationCounterpartyInput & {
  unreadCount?: number | null;
  businessUnreadCount?: number | null;
};

export function getViewerUnreadCount(
  conv: ConversationUnreadInput,
  viewer: ConversationViewerContext
): number {
  if (viewer.userId === conv.participantId) {
    return Math.max(0, Number(conv.unreadCount ?? 0));
  }
  if (viewer.isBusiness && viewer.ownBusinessId && conv.businessId === viewer.ownBusinessId) {
    return Math.max(0, Number(conv.businessUnreadCount ?? 0));
  }
  return 0;
}

export function getConversationCounterparty(
  conv: ConversationCounterpartyInput,
  viewer: ConversationViewerContext
): CounterpartyDisplay {
  if (viewer.userId === conv.participantId) {
    return {
      title: conv.businessName?.trim() || "Business",
      image: conv.businessImage ?? null,
    };
  }
  if (viewer.isBusiness && viewer.ownBusinessId && conv.businessId === viewer.ownBusinessId) {
    return {
      title: conv.participantName?.trim() || "Customer",
      image: conv.participantAvatarUrl ?? null,
    };
  }
  return {
    title: conv.businessName?.trim() || "Business",
    image: conv.businessImage ?? null,
  };
}
