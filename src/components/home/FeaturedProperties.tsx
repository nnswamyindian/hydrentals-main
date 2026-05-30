import { useState, useEffect } from 'react';
import PropertyCard from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { Building2, Users, Home, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Property, PropertyType, FurnishedStatus, GenderPreference } from '@/types/property';
import { Skeleton } from '@/components/ui/skeleton';

const db = supabase as any;

const FeaturedProperties = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await db
          .from('properties')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;

        const transformed: Property[] = (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          propertyType: p.property_type as PropertyType,
          roomType: p.room_type || '1bhk',
          rent: p.rent,
          deposit: p.deposit || 0,
          maintenance: p.maintenance || 0,
          locality: p.locality,
          address: p.address || '',
          city: p.city || 'Hyderabad',
          pincode: p.pincode || '',
          latitude: p.latitude,
          longitude: p.longitude,
          furnishedStatus: (p.furnished_status || 'unfurnished') as FurnishedStatus,
          amenities: p.amenities || [],
          genderPreference: (p.gender_preference || 'any') as GenderPreference,
          foodAvailable: p.food_available || false,
          petsAllowed: p.pets_allowed || false,
          images: p.images || [],
          availableFrom: p.available_from || new Date().toISOString(),
          isVerified: p.is_verified || false,
          isDirectOwner: p.is_direct_owner || false,
          ownerName: 'Property Owner',
          ownerId: p.owner_id,
          createdAt: p.created_at,
          listingType: p.listing_type || 'rent',
          salePrice: p.sale_price,
        }));

        setProperties(transformed);
      } catch (error) {
        console.error('Error fetching featured properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const tabs = [
    { id: 'all', label: 'All', icon: Building2 },
    { id: 'pg', label: 'PG', icon: Users },
    { id: 'apartment', label: 'Apartments', icon: Home },
    { id: 'co-living', label: 'Co-Living', icon: Users },
  ];

  const filteredProperties = activeTab === 'all' 
    ? properties.slice(0, 6)
    : properties.filter(p => p.propertyType === activeTab).slice(0, 6);

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Featured Properties
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Handpicked verified properties in prime Hyderabad locations
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "gap-2 shrink-0",
                  activeTab === tab.id && "shadow-sm"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Property Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property, index) => (
              <div
                key={property.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No properties yet</h3>
            <p className="text-muted-foreground">Properties will appear here once they are approved.</p>
          </div>
        )}

        {/* View All */}
        {properties.length > 0 && (
          <div className="text-center mt-10">
            <Link to="/properties">
              <Button variant="outline" size="lg" className="gap-2">
                View All Properties
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProperties;
