import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Filter, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { mockProperties } from '@/data/mockProperties';
import PropertyMap from '@/components/map/PropertyMap';
import { cn } from '@/lib/utils';
import SEOHead from '@/components/seo/SEOHead';

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
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="Map View | HydRent" 
        description="Search and browse verified, broker-free rental properties across Hyderabad using our interactive map." 
      />
      <Header />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Search & Filter Header - Shared and visible in both views on mobile & desktop */}
        <div className="bg-background/95 backdrop-blur-md border-b border-border/80 sticky top-16 z-20 px-4 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title, locality or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Floating Mobile Toggle Button */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000] md:hidden">
          <Button
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="shadow-xl gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-5 font-semibold text-sm transition-transform active:scale-95"
            size="lg"
          >
            {viewMode === 'list' ? (
              <>
                <MapPin className="w-4 h-4 animate-bounce" />
                Show Map
              </>
            ) : (
              <>
                <Search className="w-4 h-4 animate-pulse" />
                Show List
              </>
            )}
          </Button>
        </div>

        {/* Split View Container - Height calculated dynamically to prevent clipping behind top/bottom nav */}
        <div className="h-[calc(100vh-184px)] md:h-[calc(100vh-120px)] h-[calc(100dvh-184px)] md:h-[calc(100dvh-120px)] flex flex-row overflow-hidden relative">
          
          {/* Sidebar List View */}
          <div className={cn(
            "w-full md:w-96 h-full overflow-y-auto bg-background border-r border-border/50 transition-all duration-200",
            viewMode === 'map' ? 'hidden md:block' : 'block'
          )}>
            <div className="p-4 border-b border-border/40 bg-muted/10 sticky top-0 z-10 flex items-center justify-between">
              <h2 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {isLoading ? 'Searching...' : `${filteredProperties.length} Properties Available`}
              </h2>
            </div>
            
            <div className="p-4 space-y-3.5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="text-xs font-medium">Loading local listings...</p>
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2.5" />
                  <p className="text-sm font-medium">No listings match your search.</p>
                </div>
              ) : (
                filteredProperties.map((property) => (
                  <Link key={property.id} to={`/property/${property.id}`}>
                    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-border/50 hover:border-primary/20 overflow-hidden group">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <div className="w-22 h-22 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/30 relative">
                            <img
                              src={property.images?.[0] || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200"}
                              alt={property.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors text-foreground">{property.title}</h3>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                                <span className="truncate">{property.locality}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
                              <p className="font-bold text-primary text-sm sm:text-base">
                                ₹{property.rent.toLocaleString('en-IN')}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                              </p>
                              <Badge variant="secondary" className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                                {property.room_type || 'N/A'}
                              </Badge>
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
            "flex-1 h-full relative bg-muted/10",
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
