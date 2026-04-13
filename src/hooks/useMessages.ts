import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCurrentUser } from 'aws-amplify/auth';

function formatModelErrors(errors?: Array<{ message?: string }>): string | null {
  if (!errors || errors.length === 0) return null;
  const message = errors
    .map((e) => e?.message)
    .filter((m): m is string => Boolean(m && m.trim()))
    .join('; ')
    .trim();
  return message || null;
}

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
}

export function useMessages(): UseMessagesResult {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First check if user is authenticated
      const user = await getCurrentUser();
      if (!user) {
        setConversations([]);
        setLoading(false);
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
        setLoading(false);
        return;
      }

      const items: ConversationItem[] = res.data.map((c: any): ConversationItem => ({
        id: c.id,
        participantId: c.participantId,
        businessId: c.businessId,
        businessName: c.businessName ?? null,
        businessImage: c.businessImage ?? null,
        lastMessage: c.lastMessage ?? null,
        lastMessageTimestamp: c.lastMessageTimestamp ?? null,
        unreadCount: c.unreadCount ?? 0,
      }));
      setConversations(items);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setConversations([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch conversations'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user || !conversationId) {
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
          return existing.id;
        }

        const res = await conversationModel.create(
          {
            participantId: user.userId,
            businessId,
            businessName,
            businessImage: businessImage || undefined,
            unreadCount: 0,
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

  return {
    conversations,
    messages,
    loading,
    error,
    sendMessage,
    fetchMessages,
    createConversation,
    markConversationAsRead,
  };
}
