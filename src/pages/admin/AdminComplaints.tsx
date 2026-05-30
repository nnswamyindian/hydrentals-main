import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  Shield,
  Download,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { downloadAsCSV } from '@/lib/utils';

const db = supabase as any;

interface Complaint {
  id: string;
  complainant_name: string;
  complainant_email: string;
  broker_name: string;
  broker_phone: string | null;
  description: string;
  status: string;
  created_at: string;
  property_reference: string | null;
}

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const { data, error } = await db
          .from('broker_complaints')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setComplaints(data || []);
      } catch (error) {
        console.error('Error fetching complaints:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/contact/report-broker/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase-auth-token')}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status on server');
      
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      toast.success(`Complaint marked as ${status}`);
    } catch (e) {
      console.error('Update status error:', e);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved': return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Resolved</Badge>;
      case 'dismissed': return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Dismissed</Badge>;
      case 'investigating': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Investigating</Badge>;
      default: return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
    }
  };

  const pendingCount = complaints.filter((c) => c.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-6 md:py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Broker Complaints ({complaints.length})
            </h1>
            <p className="text-muted-foreground text-sm">{pendingCount} pending review</p>
          </div>
          <Button variant="outline" onClick={() => downloadAsCSV(complaints, 'complaints_data.csv')} disabled={complaints.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Download Data
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : complaints.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <CheckCircle className="w-12 h-12 text-green-500/50 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No complaints</h3>
              <p className="text-muted-foreground">No broker complaints have been submitted yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <Card key={complaint.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold">Broker: {complaint.broker_name}</span>
                        {getStatusBadge(complaint.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{complaint.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>By: {complaint.complainant_name} (<a href={`mailto:${complaint.complainant_email}`} className="hover:underline text-primary">{complaint.complainant_email}</a>)</span>
                        {complaint.broker_phone && <span>Broker Phone: {complaint.broker_phone}</span>}
                        <span>{new Date(complaint.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary">
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Complaint Details</DialogTitle>
                            <DialogDescription>
                              Full information about the reported issue.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-semibold text-muted-foreground block">Broker Name:</span>
                                <span>{complaint.broker_name}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground block">Broker Phone:</span>
                                <span>{complaint.broker_phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground block">Complainant:</span>
                                <span>{complaint.complainant_name}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground block">Email:</span>
                                <a href={`mailto:${complaint.complainant_email}`} className="text-primary hover:underline">{complaint.complainant_email}</a>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground block">Property Ref:</span>
                                <span>{complaint.property_reference || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground block">Date:</span>
                                <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold text-muted-foreground block mb-1">Description:</span>
                              <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                                {complaint.description}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {complaint.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(complaint.id, 'investigating')}>
                            <Clock className="w-4 h-4 mr-1" />
                            Investigate
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(complaint.id, 'dismissed')}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Dismiss
                          </Button>
                          <Button size="sm" onClick={() => updateStatus(complaint.id, 'resolved')}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminComplaints;
