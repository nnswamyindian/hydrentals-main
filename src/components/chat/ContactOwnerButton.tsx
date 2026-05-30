import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ContactOwnerButtonProps {
  ownerId: string;
  propertyId: string;
  propertyTitle: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const ContactOwnerButton = ({
  ownerId,
  propertyId,
  propertyTitle,
  variant = 'default',
  size = 'default',
  className,
}: ContactOwnerButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleClick = () => {
    if (!user) {
      toast.error('Please sign in to contact the owner');
      navigate('/auth');
      return;
    }
    
    if (user.id === ownerId) {
      toast.info("This is your own property");
      return;
    }

    setMessage(`Hi, I'm interested in your property "${propertyTitle}". Is it still available?`);
    setIsOpen(true);
  };

  const MAX_MESSAGE_LENGTH = 5000;

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error('Message is too long. Maximum 5000 characters allowed.');
      return;
    }

    setIsSending(true);
    try {
      const token = localStorage.getItem('supabase-auth-token');
      const res = await fetch('http://localhost:3000/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          receiver_id: ownerId,
          property_id: propertyId,
          content: trimmedMessage,
        })
      });

      if (!res.ok) throw new Error('Failed to send message');

      toast.success('Message sent successfully!');
      setIsOpen(false);
      
      // Navigate to messages
      navigate(`/messages?user=${ownerId}&property=${propertyId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Contact Owner
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Property Owner</DialogTitle>
            <DialogDescription>
              Send a message about "{propertyTitle}"
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!message.trim() || isSending}>
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactOwnerButton;
