import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCurrentUser } from 'aws-amplify/auth';
import { UPLIFT_REFRESH_CONVERSATIONS_EVENT } from '@/lib/messaging-events';

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

export interface ConversationItem {
  id: string;
  participantId: string;
  businessId: string;
  businessName?: string | null;
  businessImage?: string | null;
  lastMessage?: string | null;
  lastMessageTimestamp?: string | null;
  unreadCount: number;
  participantMuted: boolean;
}

export interface UseMessagesResult {
  conversations: ConversationItem[];
  messages: MessageItem[];
  loading: boolean;
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
  const [error, setError] = useState<Error | null>(null);

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
          businessId: c.businessId,
          businessName: c.businessName ?? null,
          businessImage: c.businessImage ?? null,
          lastMessage: c.lastMessage ?? null,
          lastMessageTimestamp: c.lastMessageTimestamp ?? null,
          unreadCount: c.unreadCount ?? 0,
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
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user || !conversationId || conversationId === MESSAGES_DRAFT_SEGMENT) {
        setMessages([]);
        setLoading(false);
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
        setLoading(false);
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
      setMessages(items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setLoading(false);
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

        const messageInput: any = {
          conversationId,
          senderId: user.userId,
          senderName: user.username || 'User',
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

        // Update conversation's last message
        const conv = conversations.find((c) => c.id === conversationId);
        if (conv) {
          const updateRes = await conversationModel.update(
            {
              id: conversationId,
              lastMessage: text || '[Attachment]',
              lastMessageTimestamp: new Date().toISOString(),
            },
            { authMode: 'userPool' }
          );
          const updateError = formatModelErrors(updateRes?.errors);
          if (updateError) {
            throw new Error(updateError);
          }
        }
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        throw err;
      }
    },
    [conversations]
  );

  const createConversation = useCallback(
    async (businessId: string, businessName: string, businessImage?: string): Promise<string> => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const conversationModel = getModelOrThrow('Conversation');

        // Reuse existing conversation to avoid accidental duplicates.
        const existingRes = await conversationModel.list({
          filter: { businessId: { eq: businessId } },
          authMode: 'userPool',
        });
        const existingError = formatModelErrors(existingRes?.errors);
        if (existingError) {
          throw new Error(existingError);
        }

        const existing = existingRes?.data?.find((c: any) => c.participantId === user.userId);
        if (existing?.id) {
          if (existing.participantHidden === true) {
            const unhideRes = await conversationModel.update(
              { id: existing.id, participantHidden: false },
              { authMode: 'userPool' }
            );
            const unhideErr = formatModelErrors(unhideRes?.errors);
            if (unhideErr) {
              throw new Error(unhideErr);
            }
          }
          return existing.id;
        }

        const res = await conversationModel.create(
          {
            participantId: user.userId,
            businessId,
            businessName,
            businessImage: businessImage || undefined,
            unreadCount: 0,
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
          businessId: res.data.businessId,
          businessName: res.data.businessName ?? null,
          businessImage: res.data.businessImage ?? null,
          lastMessage: null,
          lastMessageTimestamp: null,
          unreadCount: 0,
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

      const res = await conversationModel.update(
        {
          id: conversationId,
          unreadCount: 0,
        },
        { authMode: 'userPool' }
      );
      const modelError = formatModelErrors(res?.errors);
      if (modelError) {
        throw new Error(modelError);
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Error marking conversation as read:', err);
      setError(err instanceof Error ? err : new Error('Failed to mark conversation as read'));
    }
  }, []);

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
