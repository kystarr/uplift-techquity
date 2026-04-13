import { useState, useEffect, useCallback, useRef } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { UPLIFT_REFRESH_CONVERSATIONS_EVENT } from '@/lib/messaging-events';
import { formatDisplayNameForReviews } from '@/lib/format-display-name';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerBusiness } from '@/hooks/useOwnerBusiness';

function formatModelErrors(errors?: Array<{ message?: string }>): string | null {
  if (!errors || errors.length === 0) return null;
  const message = errors
    .map((e) => e?.message)
    .filter((m): m is string => Boolean(m && m.trim()))
    .join('; ')
    .trim();
  return message || null;
}

/** URL segment for compose UI before a `Conversation` row exists in the backend. */
export const MESSAGES_DRAFT_SEGMENT = 'new';

function getModelOrThrow(modelName: 'Conversation' | 'Message') {
  const model = (amplifyDataClient.models as any)?.[modelName];
  if (!model) {
    throw new Error(
      `Messaging backend is not available (${modelName} model missing). Run backend sandbox/deploy and regenerate outputs.`
    );
  }
  return model;
}

/** Matches review public name + profile photo (User.avatarUrl), not Cognito username/sub. */
async function loadParticipantProfileForMessaging(): Promise<{
  participantName: string;
  participantAvatarUrl?: string;
  senderLabel: string;
}> {
  let participantAvatarUrl: string | undefined;
  try {
    const list = await (amplifyDataClient.models as any).User.list({ authMode: 'userPool' });
    const row = (list.data ?? [])[0] as { avatarUrl?: string | null } | undefined;
    if (row?.avatarUrl?.trim()) participantAvatarUrl = row.avatarUrl.trim();
  } catch {
    // ignore
  }

  try {
    const attrs = await fetchUserAttributes();
    const formatted = formatDisplayNameForReviews(attrs.name as string | undefined).trim();
    const participantName = formatted || 'Anonymous Customer';
    return { participantName, participantAvatarUrl, senderLabel: participantName };
  } catch {
    return {
      participantName: 'Anonymous Customer',
      participantAvatarUrl,
      senderLabel: 'Anonymous Customer',
    };
  }
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

/** Snippet for inbox / conversation preview (matches send path `[Attachment]`). */
function messagePreviewLine(m: Pick<MessageItem, 'text' | 'attachmentUrl'>): string {
  const t = (m.text ?? '').trim();
  if (t) return t.length > 220 ? `${t.slice(0, 220)}…` : t;
  if (m.attachmentUrl) return '[Attachment]';
  return '';
}

export interface ConversationItem {
  id: string;
  participantId: string;
  participantName?: string | null;
  participantAvatarUrl?: string | null;
  businessId: string;
  businessName?: string | null;
  businessImage?: string | null;
  lastMessage?: string | null;
  lastMessageTimestamp?: string | null;
  unreadCount: number;
  businessUnreadCount: number;
  participantMuted: boolean;
}

export interface UseMessagesResult {
  conversations: ConversationItem[];
  messages: MessageItem[];
  /** List / inbox fetch in progress (not message thread). */
  loading: boolean;
  /** Current thread message fetch in progress. */
  messagesLoading: boolean;
  error: Error | null;
  sendMessage: (conversationId: string, text: string, attachment?: { type: string; url: string; name: string }) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  createConversation: (businessId: string, businessName: string, businessImage?: string) => Promise<string>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  /** Hide conversation for the current user only (soft delete on participant side). */
  hideConversationForMe: (conversationId: string) => Promise<void>;
  setConversationMuted: (conversationId: string, muted: boolean) => Promise<void>;
  /** Clear loaded messages/errors (e.g. when opening a draft thread). */
  resetThreadView: () => void;
}

export function useMessages(): UseMessagesResult {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const { isBusiness } = useAuth();
  const { backendRow } = useOwnerBusiness();
  const ownBusinessId = backendRow?.id ?? null;

  const fetchConversations = useCallback(async (options?: { quiet?: boolean }) => {
    const quiet = options?.quiet === true;
    if (!quiet) {
      setLoading(true);
      setError(null);
    }
    try {
      const user = await getCurrentUser();
      if (!user) {
        setConversations([]);
        return;
      }

      const conversationModel = getModelOrThrow('Conversation');

      const res = await conversationModel.list({
        authMode: 'userPool',
      });

      const modelError = formatModelErrors(res?.errors);
      if (modelError) {
        throw new Error(modelError);
      }

      if (!res || !res.data) {
        setConversations([]);
        return;
      }

      const items: ConversationItem[] = res.data
        .filter((c: any) => !c.participantHidden)
        .map((c: any): ConversationItem => ({
          id: c.id,
          participantId: c.participantId,
          participantName: c.participantName ?? null,
          participantAvatarUrl: c.participantAvatarUrl ?? null,
          businessId: c.businessId,
          businessName: c.businessName ?? null,
          businessImage: c.businessImage ?? null,
          lastMessage: c.lastMessage ?? null,
          lastMessageTimestamp: c.lastMessageTimestamp ?? null,
          unreadCount: c.unreadCount ?? 0,
          businessUnreadCount: c.businessUnreadCount ?? 0,
          participantMuted: c.participantMuted === true,
        }));
      setConversations(items);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      if (!quiet) {
        setConversations([]);
        setError(err instanceof Error ? err : new Error('Failed to fetch conversations'));
      }
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const onRefresh = () => {
      void fetchConversations({ quiet: true });
    };
    window.addEventListener(UPLIFT_REFRESH_CONVERSATIONS_EVENT, onRefresh);
    return () => window.removeEventListener(UPLIFT_REFRESH_CONVERSATIONS_EVENT, onRefresh);
  }, [fetchConversations]);

  const resetThreadView = useCallback(() => {
    setMessages([]);
    setError(null);
    setMessagesLoading(false);
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user || !conversationId || conversationId === MESSAGES_DRAFT_SEGMENT) {
        setMessages([]);
        setMessagesLoading(false);
        return;
      }

      const messageModel = getModelOrThrow('Message');

      const res = await messageModel.list({
        filter: {
          conversationId: { eq: conversationId },
        },
        authMode: 'userPool',
      });

      const modelError = formatModelErrors(res?.errors);
      if (modelError) {
        throw new Error(modelError);
      }

      if (!res || !res.data) {
        setMessages([]);
        setMessagesLoading(false);
        return;
      }

      const items: MessageItem[] = res.data.map((m: any): MessageItem => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.senderName,
        text: m.text ?? '',
        attachmentUrl: m.attachmentUrl ?? null,
        attachmentType: m.attachmentType ?? null,
        attachmentName: m.attachmentName ?? null,
        createdAt: m.createdAt,
      }));
      const sorted = items.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sorted);

      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        const line = messagePreviewLine(last);
        const ts = last.createdAt;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c;
            const previewText =
              line || (last.attachmentUrl ? '[Attachment]' : null) || c.lastMessage;
            if (!previewText && !ts) return c;
            return {
              ...c,
              lastMessage: previewText ?? c.lastMessage,
              lastMessageTimestamp: ts || c.lastMessageTimestamp,
            };
          })
        );
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      text: string,
      attachment?: { type: string; url: string; name: string }
    ) => {
      try {
        const user = await getCurrentUser();
        if (!user || !conversationId) {
          throw new Error('User not authenticated or no conversation selected');
        }

        const messageModel = getModelOrThrow('Message');
        const conversationModel = getModelOrThrow('Conversation');

        const { senderLabel } = await loadParticipantProfileForMessaging();

        const messageInput: any = {
          conversationId,
          senderId: user.userId,
          senderName: senderLabel,
          text: text || null,
        };

        if (attachment) {
          messageInput.attachmentUrl = attachment.url;
          messageInput.attachmentType = attachment.type;
          messageInput.attachmentName = attachment.name;
        }

        const res = await messageModel.create(messageInput, {
          authMode: 'userPool',
        });

        const modelError = formatModelErrors(res?.errors);
        if (modelError) {
          throw new Error(modelError);
        }

        if (!res || !res.data) {
          throw new Error('Failed to create message');
        }

        const newMessage: MessageItem = {
          id: res.data.id,
          conversationId: res.data.conversationId,
          senderId: res.data.senderId,
          senderName: res.data.senderName,
          text: res.data.text ?? '',
          attachmentUrl: res.data.attachmentUrl ?? null,
          attachmentType: res.data.attachmentType ?? null,
          attachmentName: res.data.attachmentName ?? null,
          createdAt: res.data.createdAt,
        };

        setMessages((prev) => [...prev, newMessage]);

        try {
          sessionStorage.setItem(
            'uplift:lastOwnMessage',
            JSON.stringify({ conversationId, at: Date.now() })
          );
        } catch {
          // ignore
        }

        const snippet = text?.trim() ? text.trim() : attachment ? '[Attachment]' : '';
        const ts = new Date().toISOString();

        let conv = conversationsRef.current.find((c) => c.id === conversationId);
        if (!conv) {
          const listRes = await conversationModel.list({
            filter: { id: { eq: conversationId } },
            limit: 1,
            authMode: 'userPool',
          });
          const row = listRes?.data?.[0] as any;
          if (row) {
            conv = {
              id: row.id,
              participantId: row.participantId,
              participantName: row.participantName ?? null,
              participantAvatarUrl: row.participantAvatarUrl ?? null,
              businessId: row.businessId,
              businessName: row.businessName ?? null,
              businessImage: row.businessImage ?? null,
              lastMessage: row.lastMessage ?? null,
              lastMessageTimestamp: row.lastMessageTimestamp ?? null,
              unreadCount: row.unreadCount ?? 0,
              businessUnreadCount: row.businessUnreadCount ?? 0,
              participantMuted: row.participantMuted === true,
            };
          }
        }

        let nextUnread = conv?.unreadCount ?? 0;
        let nextBusinessUnread = conv?.businessUnreadCount ?? 0;
        const participantId = conv?.participantId;
        if (participantId) {
          const isFromParticipant = user.userId === participantId;
          if (isFromParticipant) {
            nextBusinessUnread += 1;
          } else {
            nextUnread += 1;
          }
        }

        const updateRes = await conversationModel.update(
          {
            id: conversationId,
            lastMessage: snippet || '[Attachment]',
            lastMessageTimestamp: ts,
            unreadCount: nextUnread,
            businessUnreadCount: nextBusinessUnread,
          },
          { authMode: 'userPool' }
        );
        const updateError = formatModelErrors(updateRes?.errors);
        if (updateError) {
          throw new Error(updateError);
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: snippet || '[Attachment]',
                  lastMessageTimestamp: ts,
                  unreadCount: nextUnread,
                  businessUnreadCount: nextBusinessUnread,
                }
              : c
          )
        );
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        throw err;
      }
    },
    []
  );

  const createConversation = useCallback(
    async (businessId: string, businessName: string, businessImage?: string): Promise<string> => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const conversationModel = getModelOrThrow('Conversation');

        // Reuse only a still-visible thread. If the user removed it from their inbox (hidden),
        // start a new conversation so old messages stay with the archived row.
        const existingRes = await conversationModel.list({
          filter: { businessId: { eq: businessId } },
          authMode: 'userPool',
        });
        const existingError = formatModelErrors(existingRes?.errors);
        if (existingError) {
          throw new Error(existingError);
        }

        const active = existingRes?.data?.find(
          (c: any) => c.participantId === user.userId && !c.participantHidden
        );
        if (active?.id) {
          const pn = String(active.participantName ?? '').trim();
          const stale =
            !pn ||
            pn === user.userId ||
            pn === (user.username ?? '') ||
            pn === 'Customer';
          if (stale) {
            const profile = await loadParticipantProfileForMessaging();
            const patchRes = await conversationModel.update(
              {
                id: active.id,
                participantName: profile.participantName,
                participantAvatarUrl: profile.participantAvatarUrl,
              },
              { authMode: 'userPool' }
            );
            const patchErr = formatModelErrors(patchRes?.errors);
            if (patchErr) {
              console.warn('Conversation profile backfill skipped:', patchErr);
            } else {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === active.id
                    ? {
                        ...c,
                        participantName: profile.participantName,
                        participantAvatarUrl: profile.participantAvatarUrl ?? null,
                      }
                    : c
                )
              );
            }
          }
          return active.id;
        }

        const { participantName, participantAvatarUrl } = await loadParticipantProfileForMessaging();

        const res = await conversationModel.create(
          {
            participantId: user.userId,
            participantName,
            participantAvatarUrl,
            businessId,
            businessName,
            businessImage: businessImage || undefined,
            unreadCount: 0,
            businessUnreadCount: 0,
            participantHidden: false,
            participantMuted: false,
          },
          { authMode: 'userPool' }
        );

        const modelError = formatModelErrors(res?.errors);
        if (modelError) {
          throw new Error(modelError);
        }

        if (!res || !res.data) {
          throw new Error('Failed to create conversation');
        }

        const newConversation: ConversationItem = {
          id: res.data.id,
          participantId: res.data.participantId,
          participantName: res.data.participantName ?? null,
          participantAvatarUrl: res.data.participantAvatarUrl ?? null,
          businessId: res.data.businessId,
          businessName: res.data.businessName ?? null,
          businessImage: res.data.businessImage ?? null,
          lastMessage: null,
          lastMessageTimestamp: null,
          unreadCount: 0,
          businessUnreadCount: 0,
          participantMuted: false,
        };
        setConversations((prev) => [...prev, newConversation]);
        return res.data.id;
      } catch (err) {
        console.error('Error creating conversation:', err);
        setError(err instanceof Error ? err : new Error('Failed to create conversation'));
        throw err;
      }
    },
    []
  );

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user || !conversationId) {
        return;
      }

      const conversationModel = getModelOrThrow('Conversation');
      let conv = conversationsRef.current.find((c) => c.id === conversationId);
      if (!conv) {
        const listRes = await conversationModel.list({
          filter: { id: { eq: conversationId } },
          limit: 1,
          authMode: 'userPool',
        });
        const row = listRes?.data?.[0] as any;
        if (row) {
          conv = {
            id: row.id,
            participantId: row.participantId,
            participantName: row.participantName ?? null,
            participantAvatarUrl: row.participantAvatarUrl ?? null,
            businessId: row.businessId,
            businessName: row.businessName ?? null,
            businessImage: row.businessImage ?? null,
            lastMessage: row.lastMessage ?? null,
            lastMessageTimestamp: row.lastMessageTimestamp ?? null,
            unreadCount: row.unreadCount ?? 0,
            businessUnreadCount: row.businessUnreadCount ?? 0,
            participantMuted: row.participantMuted === true,
          };
        }
      }

      const payload: {
        id: string;
        unreadCount?: number;
        businessUnreadCount?: number;
      } = { id: conversationId };

      if (conv) {
        if (user.userId === conv.participantId) {
          payload.unreadCount = 0;
        } else if (isBusiness && ownBusinessId && conv.businessId === ownBusinessId) {
          payload.businessUnreadCount = 0;
        } else {
          payload.unreadCount = 0;
          payload.businessUnreadCount = 0;
        }
      } else {
        payload.unreadCount = 0;
        payload.businessUnreadCount = 0;
      }

      const res = await conversationModel.update(payload, { authMode: 'userPool' });
      const modelError = formatModelErrors(res?.errors);
      if (modelError) {
        throw new Error(modelError);
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          if (conv && user.userId === conv.participantId) {
            return { ...c, unreadCount: 0 };
          }
          if (conv && isBusiness && ownBusinessId && conv.businessId === ownBusinessId) {
            return { ...c, businessUnreadCount: 0 };
          }
          return { ...c, unreadCount: 0, businessUnreadCount: 0 };
        })
      );
    } catch (err) {
      console.error('Error marking conversation as read:', err);
      setError(err instanceof Error ? err : new Error('Failed to mark conversation as read'));
    }
  }, [isBusiness, ownBusinessId]);

  const hideConversationForMe = useCallback(async (conversationId: string) => {
    const user = await getCurrentUser();
    if (!user || !conversationId) {
      throw new Error('User not authenticated');
    }

    const conversationModel = getModelOrThrow('Conversation');

    const res = await conversationModel.update(
      {
        id: conversationId,
        participantHidden: true,
      },
      { authMode: 'userPool' }
    );
    const modelError = formatModelErrors(res?.errors);
    if (modelError) {
      throw new Error(modelError);
    }

    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setMessages([]);
    setError(null);
    setMessagesLoading(false);
  }, []);

  const setConversationMuted = useCallback(async (conversationId: string, muted: boolean) => {
    const user = await getCurrentUser();
    if (!user || !conversationId) {
      throw new Error('User not authenticated');
    }

    const conversationModel = getModelOrThrow('Conversation');

    const res = await conversationModel.update(
      {
        id: conversationId,
        participantMuted: muted,
      },
      { authMode: 'userPool' }
    );
    const modelError = formatModelErrors(res?.errors);
    if (modelError) {
      throw new Error(modelError);
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, participantMuted: muted } : c))
    );
  }, []);

  return {
    conversations,
    messages,
    loading,
    messagesLoading,
    error,
    sendMessage,
    fetchMessages,
    createConversation,
    markConversationAsRead,
    hideConversationForMe,
    setConversationMuted,
    resetThreadView,
  };
}
