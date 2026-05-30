import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useChatMessages } from '@/hooks/useMessages';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Send, Loader2, Check, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import TypingIndicator from './TypingIndicator';

interface ChatWindowProps {
  partnerId: string;
  propertyId?: string;
  onBack: () => void;
}

const ChatWindow = ({ partnerId, propertyId, onBack }: ChatWindowProps) => {
  const { user } = useAuth();
  const { messages, partnerProfile, isLoading, isSending, sendMessage } =
    useChatMessages(partnerId, propertyId);
  const { partnerPresence, setTyping } = usePresence(
    `chat-${[user?.id, partnerId].sort().join('-')}`,
    partnerId
  );
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    const msg = newMessage;
    setNewMessage('');
    setTyping(false);
    
    try {
      const success = await sendMessage(msg);
      if (!success) {
        setNewMessage(msg);
        toast.error("Message failed to send", {
          description: "There was an error sending your message. Please try again.",
        });
      }
    } catch (e) {
      setNewMessage(msg);
      toast.error("Error", {
        description: "Network or server error occurred.",
      });
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const partnerInitials = partnerProfile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const messagesByDate = messages.reduce((groups, message) => {
    const date = formatMessageDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={partnerProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {partnerInitials}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator dot */}
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
              partnerPresence.isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {partnerProfile?.full_name || 'Loading...'}
          </p>
          <p className="text-xs text-muted-foreground">
            {partnerPresence.isTyping
              ? 'typing...'
              : partnerPresence.isOnline
                ? 'Online'
                : messages.length > 0
                  ? `${messages.length} messages`
                  : 'Start a conversation'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : '')}>
                <Skeleton className="h-12 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-center py-20">
            <div>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messagesByDate).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                    {date}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {dateMessages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn('flex', isOwn ? 'justify-end' : '')}
                      >
                        {!isOwn && (
                          <Avatar className="h-7 w-7 mr-2 mt-1 shrink-0">
                            <AvatarImage src={partnerProfile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {partnerInitials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-2.5',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            isOwn ? 'justify-end' : ''
                          )}>
                            <span
                              className={cn(
                                'text-[10px]',
                                isOwn
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {format(new Date(message.created_at), 'h:mm a')}
                            </span>
                            {isOwn && (
                              message.is_read
                                ? <CheckCheck className="h-3 w-3 text-blue-300" />
                                : <Check className="h-3 w-3 text-primary-foreground/70" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {partnerPresence.isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1"
            maxLength={5000}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
