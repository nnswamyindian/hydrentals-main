import { useMessages } from '@/hooks/useMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageSquare, Home } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';

const OnlineDot = ({ partnerId, userId }: { partnerId: string; userId?: string }) => {
  const channelName = `chat-${[userId, partnerId].sort().join('-')}`;
  const { partnerPresence } = usePresence(channelName, partnerId);
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
        partnerPresence.isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'
      )}
    />
  );
};

interface ConversationListProps {
  selectedPartnerId?: string;
  onSelectConversation: (partnerId: string, propertyId?: string) => void;
}

const ConversationList = ({
  selectedPartnerId,
  onSelectConversation,
}: ConversationListProps) => {
  const { user } = useAuth();
  const { conversations, isLoading } = useMessages();

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-3" />
        <p className="font-medium">No conversations yet</p>
        <p className="text-sm mt-1">
          Start chatting by contacting a property owner
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((convo) => {
          const initials = convo.partnerName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <button
              key={`${convo.partnerId}-${convo.propertyId}`}
              onClick={() => onSelectConversation(convo.partnerId, convo.propertyId || undefined)}
              className={cn(
                'w-full p-4 flex gap-3 text-left transition-colors hover:bg-muted/50',
                selectedPartnerId === convo.partnerId && 'bg-muted'
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={convo.partnerAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <OnlineDot partnerId={convo.partnerId} userId={user?.id} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">{convo.partnerName}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(convo.lastMessageTime), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
                {convo.propertyTitle && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Home className="h-3 w-3" />
                    <span className="truncate">{convo.propertyTitle}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-sm text-muted-foreground truncate">
                    {convo.lastMessage}
                  </p>
                  {convo.unreadCount > 0 && (
                    <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-xs">
                      {convo.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default ConversationList;
