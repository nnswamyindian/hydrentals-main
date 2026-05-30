import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const db = supabase as any;

interface VisitRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  note: string | null;
  created_at: string;
  property_title?: string;
  other_name?: string;
}

interface VisitRequestsListProps {
  role: 'tenant' | 'owner';
}

const VisitRequestsList = ({ role }: VisitRequestsListProps) => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchVisits = async () => {
      const column = role === 'tenant' ? 'tenant_id' : 'owner_id';
      const { data } = await db
        .from('visit_requests')
        .select('*')
        .eq(column, user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        // Fetch property titles and other party names
        const enriched = await Promise.all(
          (data as VisitRequest[]).map(async (v) => {
            const { data: prop } = await db.from('properties').select('title').eq('id', v.property_id).single();
            const otherId = role === 'tenant' ? v.owner_id : v.tenant_id;
            const { data: profile } = await db.from('profiles_public').select('full_name').eq('id', otherId).single();
            return {
              ...v,
              property_title: prop?.title || 'Unknown Property',
              other_name: profile?.full_name || 'Unknown',
            };
          })
        );
        setVisits(enriched);
      }
      setIsLoading(false);
    };
    fetchVisits();
  }, [user, role]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await db.from('visit_requests').update({ status }).eq('id', id);
    if (!error) {
      setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
      toast.success(`Visit ${status}`);
    } else {
      toast.error('Failed to update');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
    }
  };

  if (isLoading) return null;
  if (visits.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Visit Requests
        </CardTitle>
        <CardDescription>
          {role === 'tenant' ? 'Your scheduled property visits' : 'Tenant visit requests for your properties'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visits.map((visit) => (
            <div key={visit.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <Link to={`/property/${visit.property_id}`} className="font-medium hover:text-primary transition-colors">
                  {visit.property_title}
                </Link>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{new Date(visit.visit_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span>at {visit.visit_time}</span>
                  <span>• {role === 'tenant' ? `Owner: ${visit.other_name}` : `Tenant: ${visit.other_name}`}</span>
                </div>
                {visit.note && <p className="text-xs text-muted-foreground mt-1">"{visit.note}"</p>}
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(visit.status)}
                {role === 'owner' && visit.status === 'pending' && (
                  <>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => updateStatus(visit.id, 'approved')}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => updateStatus(visit.id, 'rejected')}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VisitRequestsList;
