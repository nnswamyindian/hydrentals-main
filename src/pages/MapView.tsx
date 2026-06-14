import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Filter, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mockProperties } from '@/data/mockProperties';
import PropertyMap from '@/components/map/PropertyMap';
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  title: string;
  locality: string;
  rent: number;
  room_type: string;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
}

const db = supabase as any;

const MapView = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await db
          .from('properties')
          .select('id, title, locality, rent, room_type, latitude, longitude, images')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProperties(data || []);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Fallback coordinates for known Hyderabad localities
  const localityCoords: Record<string, { lat: number; lng: number }> = {
    'HITEC City': { lat: 17.4435, lng: 78.3772 },
    'Gachibowli': { lat: 17.4401, lng: 78.3489 },
    'Madhapur': { lat: 17.4484, lng: 78.3908 },
    'Kondapur': { lat: 17.4551, lng: 78.3538 },
    'Jubilee Hills': { lat: 17.4325, lng: 78.4073 },
    'Banjara Hills': { lat: 17.4156, lng: 78.4347 },
    'Kukatpally': { lat: 17.4849, lng: 78.4138 },
    'Miyapur': { lat: 17.4969, lng: 78.3533 },
    'Ameerpet': { lat: 17.4375, lng: 78.4483 },
    'SR Nagar': { lat: 17.4399, lng: 78.4445 },
    'Begumpet': { lat: 17.4411, lng: 78.4667 },
    'Secunderabad': { lat: 17.4399, lng: 78.4983 },
    'LB Nagar': { lat: 17.3457, lng: 78.5478 },
    'Dilsukhnagar': { lat: 17.3688, lng: 78.5247 },
    'Uppal': { lat: 17.3991, lng: 78.5593 },
    'Manikonda': { lat: 17.4052, lng: 78.3888 },
    'Nallagandla': { lat: 17.4556, lng: 78.3126 },
    'Kompally': { lat: 17.5353, lng: 78.4869 },
    'Shamshabad': { lat: 17.2403, lng: 78.4294 },
    'Chandanagar': { lat: 17.4893, lng: 78.3268 },
  };

  // Assign fallback coordinates from locality name if missing
  const enrichedProperties = (properties.length > 0 ? properties : mockProperties.map(p => ({
    id: p.id,
    title: p.title,
    locality: p.locality,
    rent: p.rent,
    room_type: p.roomType,
    latitude: null as number | null,
    longitude: null as number | null,
    images: null as string[] | null,
  }))).map(p => {
    if (p.latitude && p.longitude) return p;
    const match = Object.entries(localityCoords).find(([name]) =>
      p.locality.toLowerCase().includes(name.toLowerCase())
    );
    if (match) {
      // Add small random offset so pins don't stack exactly
      const jitter = () => (Math.random() - 0.5) * 0.005;
      return { ...p, latitude: match[1].lat + jitter(), longitude: match[1].lng + jitter() };
    }
    return p;
  });

  const filteredProperties = enrichedProperties.filter(p =>
    p.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 relative">
        {/* Floating Mobile Toggle Button */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000] md:hidden">
          <Button
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="shadow-lg gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
            size="lg"
          >
            {viewMode === 'list' ? (
              <>
                <MapPin className="w-4 h-4" />
                Show Map
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Show List
              </>
            )}
          </Button>
        </div>

        <div className="h-[calc(100vh-4rem)] flex">
          {/* Sidebar */}
          <div className={cn(
            "w-full md:w-96 h-full overflow-auto bg-background border-r border-border",
            viewMode === 'map' ? 'hidden md:block' : 'block'
          )}>
            <div className="p-4 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Properties on Map</h2>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search locality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm"
                />
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No properties found
                </div>
              ) : (
                filteredProperties.map((property) => (
                  <Link key={property.id} to={`/property/${property.id}`}>
                    <Card className="hover:shadow-card-hover transition-shadow cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
                            <img
                              src={property.images?.[0] || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200"}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm line-clamp-1">{property.title}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{property.locality}</span>
                            </div>
                            <p className="font-semibold text-primary mt-1">
                              ₹{property.rent.toLocaleString('en-IN')}/mo
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] py-0">
                                {property.room_type?.toUpperCase() || 'N/A'}
                              </Badge>
                              {property.latitude && property.longitude && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-primary" />
                                  On Map
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Map Area */}
          <div className={cn(
            "flex-1 h-full",
            viewMode === 'list' ? 'hidden md:block' : 'block'
          )}>
            <PropertyMap properties={filteredProperties} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MapView;
