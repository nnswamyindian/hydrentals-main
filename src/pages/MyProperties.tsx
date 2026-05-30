import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  Plus,
  Eye,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await db
        .from('properties')
        .select('id, title, locality, rent, status, created_at, images')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setProperties(data as Property[]);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Live</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
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

export default MyProperties;
