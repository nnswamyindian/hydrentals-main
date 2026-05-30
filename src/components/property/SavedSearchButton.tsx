import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bookmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const db = supabase as any;

interface SavedSearchButtonProps {
  filters: Record<string, any>;
}

const SavedSearchButton = ({ filters }: SavedSearchButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save searches');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setSaving(true);
    try {
      const { error } = await db.from('saved_searches').insert({
        user_id: user.id,
        name: name.trim(),
        filters,
      });
      if (error) throw error;
      toast.success('Search saved!');
      setOpen(false);
      setName('');
    } catch (error) {
      toast.error('Failed to save search');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bookmark className="w-4 h-4" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save This Search</DialogTitle>
          <DialogDescription>Give your search a name to easily find it later.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="search-name">Search Name</Label>
          <Input
            id="search-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 2BHK in Gachibowli"
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavedSearchButton;
