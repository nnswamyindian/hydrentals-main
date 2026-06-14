import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { getApiUrl } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  property_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const getHeaders = () => {
  const token = localStorage.getItem('supabase-auth-token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const API_BASE = getApiUrl('/api/chat');

export const useMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/conversations`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const json = await res.json();
      setConversations(json.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
    
    // Polling for new conversations or updates
    const intervalId = setInterval(() => {
      fetchConversations();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    refetch: fetchConversations,
  };
};

export const useChatMessages = (partnerId: string, propertyId?: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const fetchedRef = useRef(false);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!user || !partnerId) return;

    try {
      const res = await fetch(`${API_BASE}/messages/${partnerId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const json = await res.json();

      setMessages(json.data || []);
      
      if (!fetchedRef.current && json.partner) {
        setPartnerProfile({ full_name: json.partner.full_name, avatar_url: json.partner.avatar_url });
        fetchedRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [user, partnerId]);

  const MAX_MESSAGE_LENGTH = 5000;

  const sendMessage = async (content: string) => {
    if (!user || !partnerId || !content.trim()) return false;

    const trimmedContent = content.trim();
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      toast.error('Message too long');
      return false;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          receiver_id: partnerId,
          property_id: propertyId || null,
          content: trimmedContent,
        })
      });

      if (!res.ok) throw new Error('Failed to send');
      const json = await res.json();
      
      if (json.data) {
        // Optimistic update locally
        setMessages((prev) => [...prev, json.data]);
      }
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchedRef.current = false;
    setIsLoading(true);
    fetchMessages();

    // Aggressive polling for chat window
    // This perfectly emulates realtime since we are locally hosted or have minimal lag via index matching.
    const intervalId = setInterval(() => {
      fetchMessages(true);
    }, 2500);

    return () => clearInterval(intervalId);
  }, [fetchMessages]);

  return {
    messages,
    partnerProfile,
    isLoading,
    isSending,
    sendMessage,
    refetch: fetchMessages,
  };
};
