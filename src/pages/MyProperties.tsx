import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Plus,
  Eye,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Property {
  id: string;
  title: string;
  locality: string;
  rent: number;
  status: string;
  created_at: string;
  images: string[] | null;
}

const db = supabase as any;

const MyProperties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchProperties = async () => {
    if (!user) return;
    const { data } = await db
      .from('properties')
      .select('id, title, locality, rent, status, created_at, images')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setProperties(data as Property[]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const handleDeleteClick = (property: Property) => {
    setSelectedProperty(property);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedProperty) return;
    setIsActionLoading(true);
    try {
      const { error } = await db
        .from('properties')
        .update({ status })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Property status changed to ${status === 'rented' ? 'Rented Out' : 'Sold Out'}. Payment status has been reset.`,
      });

      // Refresh properties list
      await fetchProperties();
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.message || 'Failed to update property status.',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeletePermanently = async () => {
    if (!selectedProperty) return;
    setIsActionLoading(true);
    try {
      const { error } = await db
        .from('properties')
        .delete()
        .eq('id', selectedProperty.id);

      if (error) throw error;

      toast({
        title: 'Property Deleted',
        description: 'The property listing has been permanently removed.',
      });

      // Update local state
      setProperties((prev) => prev.filter((p) => p.id !== selectedProperty.id));
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      toast({
        title: 'Deletion failed',
        description: err.message || 'Failed to delete property.',
        variant: 'destructive',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Live</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'pending_payment':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20"><Clock className="w-3 h-3 mr-1" />Pending Payment</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'rented':
      case 'rented_out':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><CheckCircle className="w-3 h-3 mr-1" />Rented Out</Badge>;
      case 'sold':
      case 'sold_out':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><CheckCircle className="w-3 h-3 mr-1" />Sold Out</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold">My Properties</h1>
              <p className="text-muted-foreground">{properties.length} listings</p>
            </div>
            <Button asChild>
              <Link to="/add-property"><Plus className="w-4 h-4 mr-2" />Add Property</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              All Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : properties.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No properties yet</p>
                <Button asChild className="mt-4">
                  <Link to="/add-property"><Plus className="w-4 h-4 mr-2" />Add Your First Property</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map((property) => (
                  <div key={property.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        {property.images?.[0] ? (
                          <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Building2 className="w-6 h-6 text-muted-foreground" /></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{property.title}</h3>
                        <p className="text-sm text-muted-foreground">{property.locality}</p>
                        <p className="text-sm font-semibold">₹{property.rent.toLocaleString()}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(property.status)}
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/property/${property.id}`}><Eye className="w-4 h-4 mr-1" />View</Link>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(property)}>
                        <Trash2 className="w-4 h-4 mr-1" />Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete/Status Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Modify Property Status / Delete</DialogTitle>
            <DialogDescription>
              Choose what you would like to do with <strong>{selectedProperty?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              If this property has been rented out or sold, we recommend updating its status instead of deleting it. 
              <br />
              <strong>Warning:</strong> Changing the status to rented/sold or deleting this property will close the active listing. 
              To activate or re-list it in the future, you will need to pay the ₹500 fee again.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full flex flex-col items-center justify-center p-4 h-auto gap-2"
                onClick={() => handleUpdateStatus('rented')}
                disabled={isActionLoading}
              >
                <span className="font-semibold text-sm">Mark as Rented</span>
                <span className="text-xs text-muted-foreground">Sets status to Rented Out</span>
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full flex flex-col items-center justify-center p-4 h-auto gap-2"
                onClick={() => handleUpdateStatus('sold')}
                disabled={isActionLoading}
              >
                <span className="font-semibold text-sm">Mark as Sold</span>
                <span className="text-xs text-muted-foreground">Sets status to Sold Out</span>
              </Button>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeletePermanently}
              disabled={isActionLoading}
              className="w-full sm:w-auto"
            >
              {isActionLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isActionLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default MyProperties;
