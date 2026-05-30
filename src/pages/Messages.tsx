import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { MessageSquare } from 'lucide-react';

const Messages = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const initialPartnerId = searchParams.get('user') || undefined;
  const initialPropertyId = searchParams.get('property') || undefined;
  
  const [selectedChat, setSelectedChat] = useState<{
    partnerId: string;
    propertyId?: string;
  } | null>(
    initialPartnerId ? { partnerId: initialPartnerId, propertyId: initialPropertyId } : null
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Sign in to view messages</h1>
            <p className="text-muted-foreground">
              You need to be logged in to access your messages.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Mobile: show either list or chat, not both
  const showChatOnMobile = isMobile && selectedChat;
  const showListOnMobile = isMobile && !selectedChat;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container py-4 md:py-6 pb-20 md:pb-6">
        <h1 className={`text-2xl font-bold mb-4 md:mb-6 ${showChatOnMobile ? 'hidden' : ''}`}>Messages</h1>
        
        {/* Desktop: side-by-side layout */}
        <div className="hidden md:grid md:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-220px)] min-h-[500px]">
          <div className="border rounded-lg overflow-hidden bg-card">
            <ConversationList
              selectedPartnerId={selectedChat?.partnerId}
              onSelectConversation={(partnerId, propertyId) =>
                setSelectedChat({ partnerId, propertyId })
              }
            />
          </div>
          <div className="border rounded-lg overflow-hidden bg-card">
            {selectedChat ? (
              <ChatWindow
                partnerId={selectedChat.partnerId}
                propertyId={selectedChat.propertyId}
                onBack={() => setSelectedChat(null)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MessageSquare className="h-12 w-12" />
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: show list OR chat */}
        <div className="md:hidden h-[calc(100vh-180px)] min-h-[400px]">
          {showListOnMobile && (
            <div className="border rounded-lg overflow-hidden bg-card h-full">
              <ConversationList
                selectedPartnerId={selectedChat?.partnerId}
                onSelectConversation={(partnerId, propertyId) =>
                  setSelectedChat({ partnerId, propertyId })
                }
              />
            </div>
          )}
          {showChatOnMobile && (
            <div className="border rounded-lg overflow-hidden bg-card h-full">
              <ChatWindow
                partnerId={selectedChat.partnerId}
                propertyId={selectedChat.propertyId}
                onBack={() => setSelectedChat(null)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Messages;
