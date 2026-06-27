import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { localities, amenitiesList } from '@/data/mockProperties';
import { CameraImageCapture, CameraImageCaptureRef } from '@/components/property/CameraImageCapture';
import MapLocationPicker from '@/components/property/MapLocationPicker';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Building2,
  Home,
  Utensils,
  PawPrint,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const UnavailableDatesPicker = ({
  selectedDates,
  onDatesChange,
}: {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
}) => {
  return (
    <Calendar
      mode="multiple"
      selected={selectedDates}
      onSelect={(dates) => onDatesChange(dates || [])}
      disabled={(date) => date < new Date()}
      className={cn("p-3 pointer-events-auto")}
    />
  );
};

// Type-safe wrapper for supabase queries
const db = supabase as any;

const propertySchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(1000),
  propertyType: z.enum(['apartment', 'house', 'pg', 'shared-room', 'co-living', 'villa', 'coworking']),
  roomType: z.enum(['1rk', '1bhk', '2bhk', '3bhk', '4bhk+', 'single', 'double', 'triple']),
  rent: z.number().min(1000, 'Rent must be at least ₹1,000').max(500000),
  deposit: z.number().min(0).max(5000000),
  maintenance: z.number().min(0).max(50000).optional(),
  locality: z.string().min(1, 'Please select a locality'),
  address: z.string().min(10, 'Address must be at least 10 characters').max(200),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  furnishedStatus: z.enum(['furnished', 'semi-furnished', 'unfurnished']),
  tenantPreference: z.enum(['family', 'bachelor', 'any']),
  genderPreference: z.enum(['male', 'female', 'any']),
  foodAvailable: z.boolean(),
  petsAllowed: z.boolean(),
  amenities: z.array(z.string()),
  availableFrom: z.string().min(1, 'Please select availability date'),
});

const AddProperty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const cameraRef = useRef<CameraImageCaptureRef>(null);
  const [propertyLocation, setPropertyLocation] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    listingType: 'rent',
    propertyType: '',
    roomType: '',
    rent: '',
    deposit: '',
    maintenance: '',
    salePrice: '',
    locality: '',
    address: '',
    pincode: '',
    furnishedStatus: '',
    tenantPreference: 'any',
    genderPreference: 'any',
    foodAvailable: false,
    petsAllowed: false,
    availableFrom: '',
    isDirectOwner: false,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to list a property.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Check if user is an owner
    if (!roles.includes('owner') && !roles.includes('admin') && !roles.includes('subadmin')) {
      toast({
        title: 'Owner account required',
        description: 'You need to register as an owner or sub-admin to list properties.',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      ...formData,
      rent: Number(formData.rent),
      deposit: Number(formData.deposit),
      maintenance: formData.maintenance ? Number(formData.maintenance) : undefined,
      amenities: selectedAmenities,
    };

    const result = propertySchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors.',
        variant: 'destructive',
      });
      return;
    }

    if (!propertyLocation.lat || !propertyLocation.lng) {
      toast({
        title: 'Location Required',
        description: 'Please select the property location on the map.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // First upload images if any
      let imageUrls: string[] = [];
      if (cameraRef.current?.hasImages()) {
        imageUrls = await cameraRef.current.uploadImages();
        if (imageUrls.length === 0) {
          toast({
            title: 'Image upload failed',
            description: 'Please try capturing photos again.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }

      // Create property with images
      const isSubAdmin = roles.includes('subadmin');

      const { data: property, error: propertyError } = await db
        .from('properties')
        .insert({
          owner_id: user.id,
          title: data.title,
          description: data.description,
          listing_type: formData.listingType,
          property_type: data.propertyType,
          room_type: data.roomType,
          rent: formData.listingType === 'sale' ? 0 : data.rent,
          sale_price: formData.listingType === 'sale' ? Number(formData.salePrice) : null,
          deposit: formData.listingType === 'sale' ? 0 : data.deposit,
          maintenance: data.maintenance || null,
          locality: data.locality,
          address: data.address,
          city: 'Hyderabad',
          pincode: data.pincode,
          furnished_status: data.furnishedStatus,
          amenities: data.amenities,
          tenant_preference: data.tenantPreference,
          gender_preference: data.genderPreference,
          food_available: data.foodAvailable,
          pets_allowed: data.petsAllowed,
          available_from: data.availableFrom,
          images: imageUrls,
          latitude: propertyLocation.lat,
          longitude: propertyLocation.lng,
          is_direct_owner: formData.isDirectOwner,
          unavailable_dates: unavailableDates.map(d => d.toISOString().split('T')[0]),
          status: isSubAdmin ? 'approved' : 'pending',
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      if (!isSubAdmin) {
        // Create payment record
        await db.from('payments').insert({
          user_id: user.id,
          property_id: property.id,
          amount: 500,
          status: 'pending',
          payment_type: 'listing_fee',
        });
      }

      toast({
        title: isSubAdmin ? 'Property published!' : 'Property submitted!',
        description: isSubAdmin 
          ? 'Your property has been published and is now live.' 
          : 'Your property is pending approval. Payment of ₹500 is required.',
      });

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create property. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-4">
        <div className="container max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">List Your Property</h1>
            <p className="text-muted-foreground">
              Reach thousands of tenants looking for rentals in Hyderabad
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Property Details
              </CardTitle>
              <CardDescription>
                Fill in the details about your property. A listing fee of ₹500 applies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Property Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Spacious 2BHK Near HITEC City Metro"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                    {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your property, its features, and nearby amenities..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                    {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
                  </div>
                </div>

                {/* Listing Type */}
                <div className="space-y-2">
                  <Label>Listing Type *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={formData.listingType === 'rent' ? 'default' : 'outline'}
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => handleInputChange('listingType', 'rent')}
                    >
                      <Home className="w-5 h-5" />
                      <span className="font-semibold">For Rent</span>
                    </Button>
                    <Button
                      type="button"
                      variant={formData.listingType === 'sale' ? 'default' : 'outline'}
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => handleInputChange('listingType', 'sale')}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="font-semibold">For Sale</span>
                    </Button>
                  </div>
                </div>

                {/* Property Type */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Property Type *</Label>
                    <Select value={formData.propertyType} onValueChange={(v) => handleInputChange('propertyType', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="pg">PG/Hostel</SelectItem>
                        <SelectItem value="shared-room">Shared Room</SelectItem>
                        <SelectItem value="co-living">Co-living</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="coworking">Coworking Space</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.propertyType && <p className="text-xs text-destructive mt-1">{errors.propertyType}</p>}
                  </div>

                  <div>
                    <Label>Room Type *</Label>
                    <Select value={formData.roomType} onValueChange={(v) => handleInputChange('roomType', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1rk">1 RK</SelectItem>
                        <SelectItem value="1bhk">1 BHK</SelectItem>
                        <SelectItem value="2bhk">2 BHK</SelectItem>
                        <SelectItem value="3bhk">3 BHK</SelectItem>
                        <SelectItem value="4bhk+">4 BHK+</SelectItem>
                        <SelectItem value="single">Single Room</SelectItem>
                        <SelectItem value="double">Double Sharing</SelectItem>
                        <SelectItem value="triple">Triple Sharing</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.roomType && <p className="text-xs text-destructive mt-1">{errors.roomType}</p>}
                  </div>
                </div>

                {/* Pricing */}
                {formData.listingType === 'sale' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="salePrice">Sale Price (₹) *</Label>
                      <Input
                        id="salePrice"
                        type="number"
                        placeholder="5000000"
                        value={formData.salePrice}
                        onChange={(e) => handleInputChange('salePrice', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenance">Maintenance (₹/mo)</Label>
                      <Input
                        id="maintenance"
                        type="number"
                        placeholder="3000"
                        value={formData.maintenance}
                        onChange={(e) => handleInputChange('maintenance', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="rent">Monthly Rent (₹) *</Label>
                      <Input
                        id="rent"
                        type="number"
                        placeholder="25000"
                        value={formData.rent}
                        onChange={(e) => handleInputChange('rent', e.target.value)}
                      />
                      {errors.rent && <p className="text-xs text-destructive mt-1">{errors.rent}</p>}
                    </div>

                    <div>
                      <Label htmlFor="deposit">Deposit (₹) *</Label>
                      <Input
                        id="deposit"
                        type="number"
                        placeholder="50000"
                        value={formData.deposit}
                        onChange={(e) => handleInputChange('deposit', e.target.value)}
                      />
                      {errors.deposit && <p className="text-xs text-destructive mt-1">{errors.deposit}</p>}
                    </div>

                    <div>
                      <Label htmlFor="maintenance">Maintenance (₹)</Label>
                      <Input
                        id="maintenance"
                        type="number"
                        placeholder="3000"
                        value={formData.maintenance}
                        onChange={(e) => handleInputChange('maintenance', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Locality *</Label>
                      <Select value={formData.locality} onValueChange={(v) => handleInputChange('locality', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select locality" />
                        </SelectTrigger>
                        <SelectContent>
                          {localities.map((loc) => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.locality && <p className="text-xs text-destructive mt-1">{errors.locality}</p>}
                    </div>

                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        placeholder="500081"
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => handleInputChange('pincode', e.target.value)}
                      />
                      {errors.pincode && <p className="text-xs text-destructive mt-1">{errors.pincode}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Full Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="Building name, street, area..."
                      rows={2}
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                    {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
                  </div>
                </div>

                {/* Map Location Picker */}
                <MapLocationPicker
                  latitude={propertyLocation.lat}
                  longitude={propertyLocation.lng}
                  onLocationChange={(lat, lng) => setPropertyLocation({ lat, lng })}
                  locality={formData.locality}
                />

                {/* Features */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Furnished Status *</Label>
                    <Select value={formData.furnishedStatus} onValueChange={(v) => handleInputChange('furnishedStatus', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="furnished">Fully Furnished</SelectItem>
                        <SelectItem value="semi-furnished">Semi-Furnished</SelectItem>
                        <SelectItem value="unfurnished">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.furnishedStatus && <p className="text-xs text-destructive mt-1">{errors.furnishedStatus}</p>}
                  </div>

                  <div>
                    <Label>Tenant Preference</Label>
                    <Select value={formData.tenantPreference} onValueChange={(v) => handleInputChange('tenantPreference', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any (Family / Bachelor)</SelectItem>
                        <SelectItem value="family">Family Only</SelectItem>
                        <SelectItem value="bachelor">Bachelor Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Gender Preference</Label>
                    <Select value={formData.genderPreference} onValueChange={(v) => handleInputChange('genderPreference', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="male">Male Only</SelectItem>
                        <SelectItem value="female">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="availableFrom">Available From *</Label>
                  <Input
                    id="availableFrom"
                    type="date"
                    value={formData.availableFrom}
                    onChange={(e) => handleInputChange('availableFrom', e.target.value)}
                  />
                  {errors.availableFrom && <p className="text-xs text-destructive mt-1">{errors.availableFrom}</p>}
                </div>

                {/* Unavailable Dates */}
                <div>
                  <Label className="mb-2 block">Mark Unavailable Dates (optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Select dates when the property is not available for visits or move-in.</p>
                  <div className="border rounded-lg p-3 inline-block">
                    <UnavailableDatesPicker
                      selectedDates={unavailableDates}
                      onDatesChange={setUnavailableDates}
                    />
                  </div>
                  {unavailableDates.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {unavailableDates.length} date(s) marked as unavailable
                    </p>
                  )}
                </div>

                {/* Property Photos */}
                {user && (
                  <CameraImageCapture
                    ref={cameraRef}
                    userId={user.id}
                    maxImages={5}
                  />
                )}

                {/* Amenities */}
                <div>
                  <Label className="mb-3 block">Amenities</Label>
                  <div className="flex flex-wrap gap-2">
                    {amenitiesList.map((amenity) => (
                      <Button
                        key={amenity}
                        type="button"
                        variant={selectedAmenities.includes(amenity) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleAmenity(amenity)}
                      >
                        {amenity}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="foodAvailable"
                      checked={formData.foodAvailable}
                      onCheckedChange={(checked) => handleInputChange('foodAvailable', checked as boolean)}
                    />
                    <Label htmlFor="foodAvailable" className="flex items-center gap-1 cursor-pointer">
                      <Utensils className="w-4 h-4" />
                      Food Available
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="petsAllowed"
                      checked={formData.petsAllowed}
                      onCheckedChange={(checked) => handleInputChange('petsAllowed', checked as boolean)}
                    />
                    <Label htmlFor="petsAllowed" className="flex items-center gap-1 cursor-pointer">
                      <PawPrint className="w-4 h-4" />
                      Pets Allowed
                    </Label>
                  </div>
                </div>

                {/* Anti-Broker Declaration */}
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="isDirectOwner"
                      checked={formData.isDirectOwner}
                      onCheckedChange={(checked) => handleInputChange('isDirectOwner', checked as boolean)}
                    />
                    <div>
                      <Label htmlFor="isDirectOwner" className="cursor-pointer font-semibold">
                        I am the direct owner / authorized representative — NOT a broker
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        HydRent is a broker-free platform. Listing as a broker is a violation of our Terms and may result in legal action.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">Listing Fee</p>
                      <p className="text-sm text-muted-foreground">One-time fee per property</p>
                    </div>
                    <p className="text-2xl font-bold">₹500</p>
                  </div>

                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Property
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddProperty;
