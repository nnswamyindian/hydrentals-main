import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

interface CompareProperty {
  id: string;
  title: string;
  locality: string;
  rent: number;
  deposit: number | null;
  maintenance: number | null;
  property_type: string;
  room_type: string | null;
  furnished_status: string | null;
  amenities: string[] | null;
  gender_preference: string | null;
  food_available: boolean | null;
  pets_allowed: boolean | null;
  images: string[] | null;
}

const Compare = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<CompareProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    const fetchProperties = async () => {
      if (ids.length === 0) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await db
          .from('properties')
          .select('id, title, locality, rent, deposit, maintenance, property_type, room_type, furnished_status, amenities, gender_preference, food_available, pets_allowed, images')
          .in('id', ids);
        if (error) throw error;
        setProperties(data || []);
      } catch (error) {
        console.error('Error fetching compare properties:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const formatPrice = (price: number | null) => price ? `₹${price.toLocaleString('en-IN')}` : '—';

  const compareFields = [
    { label: 'Rent/mo', render: (p: CompareProperty) => formatPrice(p.rent) },
    { label: 'Deposit', render: (p: CompareProperty) => formatPrice(p.deposit) },
    { label: 'Maintenance', render: (p: CompareProperty) => formatPrice(p.maintenance) },
    { label: 'Type', render: (p: CompareProperty) => <span className="capitalize">{p.property_type}</span> },
    { label: 'Room', render: (p: CompareProperty) => <span className="uppercase">{p.room_type || '—'}</span> },
    { label: 'Furnished', render: (p: CompareProperty) => <span className="capitalize">{p.furnished_status || '—'}</span> },
    { label: 'Gender Pref', render: (p: CompareProperty) => <span className="capitalize">{p.gender_preference || 'Any'}</span> },
    { label: 'Food', render: (p: CompareProperty) => p.food_available ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground" /> },
    { label: 'Pets', render: (p: CompareProperty) => p.pets_allowed ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground" /> },
    { label: 'Amenities', render: (p: CompareProperty) => (
      <div className="flex flex-wrap gap-1">
        {(p.amenities || []).slice(0, 5).map((a) => (
          <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
        ))}
        {(p.amenities || []).length > 5 && <Badge variant="outline" className="text-xs">+{(p.amenities || []).length - 5}</Badge>}
      </div>
    )},
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container py-6 md:py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/properties"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Compare Properties</h1>
            <p className="text-muted-foreground text-sm">{properties.length} properties selected</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No properties to compare</h3>
              <p className="text-muted-foreground mb-4">Add properties from the listings page to compare them side-by-side</p>
              <Button asChild><Link to="/properties">Browse Properties</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground w-32" />
                  {properties.map((p) => (
                    <th key={p.id} className="p-3 min-w-[220px]">
                      <Card className="overflow-hidden">
                        <div className="aspect-video">
                          <img
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400'}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-3">
                          <Link to={`/property/${p.id}`} className="font-semibold text-sm hover:text-primary line-clamp-1">
                            {p.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{p.locality}</p>
                        </CardContent>
                      </Card>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareFields.map((field) => (
                  <tr key={field.label} className="border-t border-border">
                    <td className="p-3 text-sm font-medium text-muted-foreground">{field.label}</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-sm font-medium">{field.render(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Compare;
