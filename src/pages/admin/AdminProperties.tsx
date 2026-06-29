import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, getApiUrl } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ArrowLeft,
  Eye,
  MapPin,
  IndianRupee,
  Download,
} from 'lucide-react';
import { downloadAsCSV } from '@/lib/utils';

interface Property {
  id: string;
  title: string;
  locality: string;
  rent: number;
  status: string;
  owner_id: string;
  property_type: string;
  created_at: string;
  payments?: {
    id: string;
    amount: number;
    status: string;
    payment_link?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
  } | null;
}

const db = supabase as any;

const AdminProperties = () => {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      let query = db.from('properties').select('*, payments(*)').order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data as Property[]);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (propertyId: string) => {
    try {
      const { error } = await db.from('properties').update({ status: 'approved' }).eq('id', propertyId);

      if (error) throw error;

      toast({ title: 'Property approved', description: 'Listing approved. Payment link sent to the owner.' });
      fetchProperties();
    } catch (error: any) {
      console.error('Error approving property:', error);
      toast({ title: 'Error', description: error?.message || 'Failed to approve property.', variant: 'destructive' });
    }
  };

  const handleResendLink = async (propertyId: string) => {
    try {
      const token = localStorage.getItem('supabase-auth-token');
      const res = await fetch(getApiUrl(`/api/properties/${propertyId}/resend-payment-link`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to resend payment link');
      }

      toast({ title: 'Success', description: 'Payment link email resent successfully.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Failed to resend payment link.', variant: 'destructive' });
    }
  };

  const handleManualVerify = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to manually verify payment for this property and publish it live?')) return;
    
    try {
      const token = localStorage.getItem('supabase-auth-token');
      const res = await fetch(getApiUrl(`/api/properties/${propertyId}/manual-verify-payment`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to manually verify payment');
      }

      toast({ title: 'Listing Published', description: 'Listing was manually verified and is now live.' });
      fetchProperties();
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Failed to verify payment.', variant: 'destructive' });
    }
  };

  const handleReject = async (propertyId: string) => {
    try {
      const { error } = await db.from('properties').update({ status: 'rejected' }).eq('id', propertyId);

      if (error) throw error;

      setProperties((prev) => prev.map((p) => (p.id === propertyId ? { ...p, status: 'rejected' } : p)));
      toast({ title: 'Property rejected', description: 'The owner will be notified.' });
    } catch (error) {
      console.error('Error rejecting property:', error);
      toast({ title: 'Error', description: 'Failed to reject property.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved / Live</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Pending Review</Badge>;
      case 'pending_payment':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Payment</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.locality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/admin/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="font-display text-3xl font-bold">Manage Properties</h1>
            <p className="text-muted-foreground">Review and moderate property listings</p>
          </div>
          <Button variant="outline" onClick={() => downloadAsCSV(filteredProperties, 'properties_data.csv')} disabled={filteredProperties.length === 0} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Data
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or locality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="approved">Approved / Live</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Properties List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Properties ({filteredProperties.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading properties...</p>
            ) : filteredProperties.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No properties found</p>
            ) : (
              <div className="space-y-4">
                {filteredProperties.map((property) => (
                  <div
                    key={property.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{property.title}</h3>
                        {getStatusBadge(property.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {property.locality}
                        </span>
                        <span className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
                          {property.rent.toLocaleString()}/mo
                        </span>
                        <span className="capitalize">{property.property_type}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/property/${property.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      {property.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleReject(property.id)}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button size="sm" onClick={() => handleApprove(property.id)}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                      {property.status === 'pending_payment' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = property.payments?.payment_link;
                              if (link) {
                                navigator.clipboard.writeText(link);
                                toast({ title: 'Link Copied', description: 'Payment Link copied to clipboard.' });
                              } else {
                                toast({ title: 'Error', description: 'No payment link found.', variant: 'destructive' });
                              }
                            }}
                          >
                            Copy Link
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleResendLink(property.id)}>
                            Resend Email
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleManualVerify(property.id)}>
                            Verify Paid
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AdminProperties;
