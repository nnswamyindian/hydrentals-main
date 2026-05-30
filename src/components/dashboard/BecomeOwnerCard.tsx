import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

const db = supabase as any;

const BecomeOwnerCard = () => {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show if already an owner
  if (roles.includes('owner')) {
    return null;
  }

  const handleBecomeOwner = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Check if already has owner role
      const { data: existingRole } = await db
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .maybeSingle();

      if (existingRole) {
        toast({
          title: 'Already an owner',
          description: 'You already have owner privileges.',
        });
        navigate('/dashboard');
        return;
      }

      // Add owner role
      const { error } = await db.from('user_roles').insert({
        user_id: user.id,
        role: 'owner',
      });

      if (error) throw error;

      toast({
        title: 'Congratulations! 🎉',
        description: 'You are now a property owner. You can list your properties.',
      });

      // Refresh the page to update roles
      window.location.reload();
    } catch (error) {
      console.error('Error becoming owner:', error);
      toast({
        title: 'Error',
        description: 'Failed to upgrade account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Become a Property Owner
        </CardTitle>
        <CardDescription>
          Have a property to rent? List it on HydRent and reach thousands of tenants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              List unlimited properties
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Get verified tenant leads
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Manage your listings easily
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              In-app messaging with tenants
            </li>
          </ul>
          <Button onClick={handleBecomeOwner} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Register as Owner
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BecomeOwnerCard;
