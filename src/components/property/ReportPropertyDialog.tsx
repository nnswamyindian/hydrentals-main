import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const db = supabase as any;

interface ReportPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
}

const REPORT_REASONS = [
  { value: 'fake_photos', label: 'Fake or misleading photos' },
  { value: 'wrong_price', label: 'Incorrect price information' },
  { value: 'broker_listing', label: 'This is a broker listing' },
  { value: 'already_rented', label: 'Property already rented/sold' },
  { value: 'scam', label: 'Suspected scam or fraud' },
  { value: 'other', label: 'Other' },
];

const ReportPropertyDialog = ({ open, onOpenChange, propertyId, propertyTitle }: ReportPropertyDialogProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to report a property');
      return;
    }
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await db.from('property_reports').insert({
        property_id: propertyId,
        reporter_id: user.id,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;
      toast.success('Report submitted. Our team will review it shortly.');
      onOpenChange(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Report Property
          </DialogTitle>
          <DialogDescription>Report "{propertyTitle}" for violating our guidelines</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REPORT_REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={r.value} id={r.value} />
                <Label htmlFor={r.value} className="cursor-pointer flex-1">{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="Add more details (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!reason || isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPropertyDialog;
