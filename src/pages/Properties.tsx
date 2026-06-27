import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  SlidersHorizontal, 
  Grid3X3, 
  List, 
  MapPin,
  Loader2,
  GitCompareArrows,
  X,
} from 'lucide-react';
import { mockProperties, localities, amenitiesList } from '@/data/mockProperties';
import { PropertyType, FurnishedStatus, GenderPreference, Property as PropertyInterface } from '@/types/property';
import { haversineDistance, hyderabadLandmarks, Landmark } from '@/lib/distance';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import SavedSearchButton from '@/components/property/SavedSearchButton';
import SEOHead from '@/components/seo/SEOHead';

const db = supabase as any;

const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbProperties, setDbProperties] = useState<PropertyInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'rent' | 'sale'>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  
  // Filters
  const [selectedLocality, setSelectedLocality] = useState(searchParams.get('locality') || '');
  const [budgetRange, setBudgetRange] = useState([
    Number(searchParams.get('minBudget')) || 0,
    Number(searchParams.get('maxBudget')) || 100000,
  ]);
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);
  const [selectedFurnished, setSelectedFurnished] = useState<FurnishedStatus[]>([]);
  const [selectedGender, setSelectedGender] = useState<GenderPreference | ''>('');
  const [nearMetro, setNearMetro] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [foodAvailable, setFoodAvailable] = useState(false);
  const [nearbyLandmark, setNearbyLandmark] = useState<string>('');

  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [listingTypeFilter, selectedLocality, budgetRange, selectedTypes, selectedFurnished, selectedGender, petsAllowed, foodAvailable, searchQuery]);

  // Fetch approved properties from database
  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      try {
        let query = db
          .from('properties')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (listingTypeFilter !== 'all') query = query.eq('listing_type', listingTypeFilter);
        if (selectedLocality) query = query.eq('locality', selectedLocality);
        if (selectedTypes.length > 0) query = query.in('property_type', selectedTypes);
        if (selectedFurnished.length > 0) query = query.in('furnished_status', selectedFurnished);
        if (selectedGender && selectedGender !== 'any') query = query.eq('gender_preference', selectedGender);
        if (petsAllowed) query = query.eq('pets_allowed', true);
        if (foodAvailable) query = query.eq('food_available', true);
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,locality.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }
        
        query = query.gte('rent', budgetRange[0]).lte('rent', budgetRange[1]);

        // Pagination
        const from = page * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error } = await query;
        if (error) throw error;

        // Fetch owner verification status for all unique owners
        const ownerIds = [...new Set((data || []).map((p: any) => p.owner_id))];
        let ownerVerifiedMap = new Map<string, boolean>();
        if (ownerIds.length > 0) {
          const { data: profiles } = await db
            .from('profiles_public')
            .select('id, is_verified')
            .in('id', ownerIds);
          (profiles || []).forEach((p: any) => {
            ownerVerifiedMap.set(p.id, p.is_verified || false);
          });
        }

        // Transform database properties
        const transformed: PropertyInterface[] = (data || []).map((p: any) => {
          return {
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
            furnishedStatus: (p.furnished_status || 'unfurnished') as FurnishedStatus,
            amenities: p.amenities || [],
            genderPreference: (p.gender_preference || 'any') as GenderPreference,
            foodAvailable: p.food_available || false,
            petsAllowed: p.pets_allowed || false,
            images: p.images || [],
            availableFrom: p.available_from || new Date().toISOString(),
            isVerified: p.is_verified || false,
            isDirectOwner: p.is_direct_owner || false,
            ownerVerified: ownerVerifiedMap.get(p.owner_id) || false,
            ownerName: 'Property Owner',
            ownerId: p.owner_id,
            createdAt: p.created_at,
            latitude: p.latitude,
            longitude: p.longitude,
            listingType: p.listing_type || 'rent',
            salePrice: p.sale_price,
          };
        });

        if (page === 0) setDbProperties(transformed);
        else setDbProperties(prev => {
          // avoid duplicates
          const newItems = transformed.filter(t => !prev.some(p => p.id === t.id));
          return [...prev, ...newItems];
        });

      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchProperties();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, listingTypeFilter, selectedLocality, budgetRange, selectedTypes, selectedFurnished, selectedGender, petsAllowed, foodAvailable, searchQuery]);

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'pg', label: 'PG' },
    { value: 'shared-room', label: 'Shared Room' },
    { value: 'co-living', label: 'Co-Living' },
    { value: 'house', label: 'House' },
    { value: 'villa', label: 'Villa' },
  ];

  const furnishedOptions: { value: FurnishedStatus; label: string }[] = [
    { value: 'furnished', label: 'Furnished' },
    { value: 'semi-furnished', label: 'Semi-Furnished' },
    { value: 'unfurnished', label: 'Unfurnished' },
  ];

  // Distance filter (remains client-side due to missing PostGIS on standard config)
  const filteredProperties = useMemo(() => {
    return dbProperties.filter((property: any) => {
      if (nearbyLandmark && property.latitude && property.longitude) {
        const lm = hyderabadLandmarks.find(l => l.name === nearbyLandmark);
        if (lm) {
          const dist = haversineDistance(property.latitude, property.longitude, lm.lat, lm.lng);
          if (dist > 5) return false; // 5km radius
        }
      }
      return true;
    });
  }, [dbProperties, nearbyLandmark]);

  const activeFiltersCount = [
    selectedLocality,
    selectedTypes.length > 0,
    selectedFurnished.length > 0,
    selectedGender,
    nearMetro,
    petsAllowed,
    foodAvailable,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedLocality('');
    setBudgetRange([0, 100000]);
    setSelectedTypes([]);
    setSelectedFurnished([]);
    setSelectedGender('');
    setNearMetro(false);
    setPetsAllowed(false);
    setFoodAvailable(false);
    setNearbyLandmark('');
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Locality */}
      <div>
        <label className="text-sm font-medium mb-2 block">Locality</label>
        <Select value={selectedLocality || "all"} onValueChange={(v) => setSelectedLocality(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All localities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All localities</SelectItem>
            {localities.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget Range */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Budget: ₹{budgetRange[0].toLocaleString()} - ₹{budgetRange[1].toLocaleString()}
        </label>
        <Slider
          value={budgetRange}
          onValueChange={setBudgetRange}
          min={0}
          max={100000}
          step={1000}
          className="mt-4"
        />
      </div>

      {/* Property Type */}
      <div>
        <label className="text-sm font-medium mb-2 block">Property Type</label>
        <div className="flex flex-wrap gap-2">
          {propertyTypes.map((type) => (
            <Badge
              key={type.value}
              variant={selectedTypes.includes(type.value) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                setSelectedTypes(prev =>
                  prev.includes(type.value)
                    ? prev.filter(t => t !== type.value)
                    : [...prev, type.value]
                );
              }}
            >
              {type.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Furnished Status */}
      <div>
        <label className="text-sm font-medium mb-2 block">Furnished Status</label>
        <div className="flex flex-wrap gap-2">
          {furnishedOptions.map((option) => (
            <Badge
              key={option.value}
              variant={selectedFurnished.includes(option.value) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                setSelectedFurnished(prev =>
                  prev.includes(option.value)
                    ? prev.filter(f => f !== option.value)
                    : [...prev, option.value]
                );
              }}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Gender Preference */}
      <div>
        <label className="text-sm font-medium mb-2 block">Gender Preference</label>
        <Select value={selectedGender || "any"} onValueChange={(v) => setSelectedGender(v === "any" ? "" : v as GenderPreference)}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Filters */}
      <div className="space-y-3">
        <label className="text-sm font-medium block">Quick Filters</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={nearMetro} onCheckedChange={(c) => setNearMetro(!!c)} />
            <span className="text-sm">Near Metro (&lt;2km)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={petsAllowed} onCheckedChange={(c) => setPetsAllowed(!!c)} />
            <span className="text-sm">Pets Allowed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={foodAvailable} onCheckedChange={(c) => setFoodAvailable(!!c)} />
            <span className="text-sm">Meals Included</span>
          </label>
        </div>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearAllFilters}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <SEOHead 
        title="Properties for Rent in Gachibowli, Madhapur, Kondapur Hyderabad | PGs & Flats" 
        description="Explore broker-free flats, luxury PGs, hostels, and co-living spaces for rent in top areas of Hyderabad. Search by price, furnished status, and direct owner listings." 
      />
      <Header />
      
      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Properties in Hyderabad
            </h1>
            <p className="text-muted-foreground mt-1">
              {isLoading ? 'Loading...' : `${filteredProperties.length} properties found`}
            </p>
            {/* Listing Type Tabs */}
            <div className="flex gap-2 mt-4">
              {(['all', 'rent', 'sale'] as const).map((type) => (
                <Button
                  key={type}
                  variant={listingTypeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setListingTypeFilter(type)}
                >
                  {type === 'all' ? 'All' : type === 'rent' ? 'For Rent' : 'For Sale'}
                </Button>
              ))}
            </div>
            {/* Nearby Landmark Quick Filters */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {['HITEC City', 'Gachibowli', 'Financial District', 'Raidurg Metro', 'Miyapur Metro'].map((name) => (
                <Badge
                  key={name}
                  variant={nearbyLandmark === name ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setNearbyLandmark(nearbyLandmark === name ? '' : name)}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  Near {name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Compare Tip */}
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 mb-4 text-sm">
            <GitCompareArrows className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> Click the <GitCompareArrows className="w-3.5 h-3.5 inline" /> icon on any property card to select it, then compare up to 4 properties side-by-side.
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              {/* Save Search */}
              <SavedSearchButton
                filters={{
                  locality: selectedLocality,
                  budgetRange,
                  selectedTypes,
                  selectedFurnished,
                  selectedGender,
                  nearMetro,
                  petsAllowed,
                  foodAvailable,
                  listingTypeFilter,
                }}
              />
              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="default" className="ml-1 h-5 w-5 p-0 justify-center">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              {/* View Toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="bg-card rounded-2xl p-6 shadow-card sticky top-24">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </h3>
                <FilterContent />
              </div>
            </aside>

            {/* Property Grid */}
            <div className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredProperties.length > 0 ? (
                <div className={cn(
                  "grid gap-6",
                  viewMode === 'grid' 
                    ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
                    : "grid-cols-1"
                )}>
                  {filteredProperties.map((property, index) => (
                    <div
                      key={property.id}
                      className="animate-fade-in relative"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Compare checkbox */}
                      <button
                        onClick={() => toggleCompare(property.id)}
                        className={cn(
                          "absolute top-3 right-14 z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                          compareIds.includes(property.id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background/90 border-muted-foreground/40 text-muted-foreground hover:border-primary"
                        )}
                        title="Add to compare"
                      >
                        <GitCompareArrows className="w-3.5 h-3.5" />
                      </button>
                    <PropertyCard property={{
                      ...property,
                      distanceText: nearbyLandmark && property.latitude && property.longitude
                        ? (() => {
                            const lm = hyderabadLandmarks.find(l => l.name === nearbyLandmark);
                            if (!lm) return undefined;
                            const d = haversineDistance(property.latitude, property.longitude, lm.lat, lm.lng);
                            return `${d.toFixed(1)}km from ${nearbyLandmark}`;
                          })()
                        : undefined,
                    }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">No properties found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters to find more options
                  </p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Compare Bar */}
        {compareIds.length > 0 && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-lg px-5 py-3 flex items-center gap-4 animate-fade-in">
            <GitCompareArrows className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{compareIds.length} selected</span>
            <Button
              size="sm"
              onClick={() => navigate(`/compare?ids=${compareIds.join(',')}`)}
              disabled={compareIds.length < 2}
            >
              Compare Now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Properties;
