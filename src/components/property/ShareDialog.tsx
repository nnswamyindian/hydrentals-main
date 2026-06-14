import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, MessageCircle, Mail, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyTitle: string;
  propertyId: string;
}

const ShareDialog = ({ open, onOpenChange, propertyTitle, propertyId }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/property/${propertyId}`;
  const shareText = `Check out this property: ${propertyTitle}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMessageCircle = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank');
  };

  const handleEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: propertyTitle, text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Property
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="text-sm" />
            <Button size="icon" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="flex-col gap-2 h-auto py-4" onClick={handleMessageCircle}>
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span className="text-xs">MessageCircle</span>
            </Button>
            <Button variant="outline" className="flex-col gap-2 h-auto py-4" onClick={handleEmail}>
              <Mail className="w-5 h-5 text-blue-500" />
              <span className="text-xs">Email</span>
            </Button>
            {navigator.share && (
              <Button variant="outline" className="flex-col gap-2 h-auto py-4" onClick={handleNativeShare}>
                <Share2 className="w-5 h-5 text-primary" />
                <span className="text-xs">More</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
