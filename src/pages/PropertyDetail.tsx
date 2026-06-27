import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MapPin,
  Train,
  Heart,
  Share2,
  Phone,
  MessageCircle,
  Calendar,
  Home,
  Users,
  UtensilsCrossed,
  Wifi,
  Car,
  ShieldCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  Check,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import ReviewSection from '@/components/property/ReviewSection';
import ShareDialog from '@/components/property/ShareDialog';
import ReportPropertyDialog from '@/components/property/ReportPropertyDialog';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import ImageGallery from '@/components/property/ImageGallery';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import SEOHead from '@/components/seo/SEOHead';

const db = supabase as any;

interface DbProperty {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  room_type: string | null;
  rent: number;
  deposit: number | null;
  maintenance: number | null;
  locality: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  furnished_status: string | null;
  amenities: string[] | null;
  gender_preference: string | null;
  food_available: boolean | null;
  pets_allowed: boolean | null;
  available_from: string | null;
  images: string[] | null;
  owner_id: string;
  is_verified: boolean | null;
  created_at: string | null;
}

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if property is favorited
  useEffect(() => {
    if (!user || !id) return;
    const checkFav = async () => {
      const { data } = await db
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', id)
        .maybeSingle();
      if (data) setIsFavorite(true);
    };
    checkFav();
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      navigate('/auth');
      return;
    }
    try {
      if (isFavorite) {
        await db.from('favorites').delete().eq('user_id', user.id).eq('property_id', id);
        setIsFavorite(false);
      } else {
        await db.from('favorites').insert({ user_id: user.id, property_id: id });
        setIsFavorite(true);
      }
    } catch {
      toast.error('Failed to update favorite');
    }
  };
  const [property, setProperty] = useState<DbProperty | null>(null);
  const [ownerName, setOwnerName] = useState('Property Owner');
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Dialog states
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitNote, setVisitNote] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const { data, error } = await db
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setProperty(data);

        // Fetch owner name and phone from profiles_public
        const { data: profile } = await db
          .from('profiles_public')
          .select('full_name, phone, is_verified')
          .eq('id', data.owner_id)
          .maybeSingle();

        if (profile?.full_name) {
          setOwnerName(profile.full_name);
        }
        if (profile?.phone) {
          setOwnerPhone(profile.phone);
        }
        if (profile?.is_verified) {
          setOwnerVerified(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const requireAuth = (action: () => void) => {
    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/auth');
      return;
    }
    action();
  };

  const handleContactOwner = () => {
    requireAuth(() => {
      if (user?.id === property?.owner_id) {
        toast.info("This is your own property");
        return;
      }
      setShowPhoneDialog(true);
    });
  };

  const handleSendMessage = () => {
    requireAuth(() => {
      if (user?.id === property?.owner_id) {
        toast.info("This is your own property");
        return;
      }
      setMessageText(`Hi, I'm interested in your property "${property?.title}". Is it still available?`);
      setShowMessageDialog(true);
    });
  };

  const handleScheduleVisit = () => {
    requireAuth(() => {
      if (user?.id === property?.owner_id) {
        toast.info("This is your own property");
        return;
      }
      setVisitDate('');
      setVisitTime('');
      setVisitNote('');
      setShowVisitDialog(true);
    });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user || !property) return;
    setIsSending(true);
    try {
      const { error } = await db.from('messages').insert({
        sender_id: user.id,
        receiver_id: property.owner_id,
        property_id: property.id,
        content: content.trim(),
      });
      if (error) throw error;
      toast.success('Message sent successfully!');
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessageSubmit = async () => {
    const success = await sendMessage(messageText);
    if (success) {
      setShowMessageDialog(false);
      navigate(`/messages?user=${property?.owner_id}&property=${property?.id}`);
    }
  };

  const handleScheduleVisitSubmit = async () => {
    if (!visitDate || !visitTime || !user || !property) {
      toast.error('Please select a date and time');
      return;
    }
    setIsSending(true);
    try {
      // Insert into visit_requests table
      const { error: visitError } = await db.from('visit_requests').insert({
        property_id: property.id,
        tenant_id: user.id,
        owner_id: property.owner_id,
        visit_date: visitDate,
        visit_time: visitTime,
        note: visitNote.trim() || null,
      });
      if (visitError) throw visitError;

      // Also send a message
      const visitMessage = `📅 Visit Request\nDate: ${visitDate}\nTime: ${visitTime}${visitNote ? `\nNote: ${visitNote}` : ''}\n\nI'd like to schedule a visit to "${property.title}".`;
      await sendMessage(visitMessage);
      toast.success('Visit request sent!');
      setShowVisitDialog(false);
      navigate(`/messages?user=${property.owner_id}&property=${property.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule visit');
    } finally {
      setIsSending(false);
    }
  };

  // Track recently viewed and property view
  const { addItem } = useRecentlyViewed();
  useEffect(() => {
    if (!property) return;
    addItem({
      id: property.id,
      title: property.title,
      locality: property.locality,
      rent: property.rent,
      image: property.images?.[0],
    });
    const trackView = async () => {
      try {
        await db.from('property_views').insert({
          property_id: property.id,
          user_id: user?.id || null,
        });
      } catch { /* silent */ }
    };
    trackView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEOHead title="Loading Property..." description="Loading property details" />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEOHead title="Property Not Found" description="The property you are looking for does not exist." />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold mb-2">Property Not Found</h1>
            <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
            <Link to="/properties">
              <Button>Browse Properties</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  const amenityIcons: Record<string, React.ReactNode> = {
    'WiFi': <Wifi className="w-4 h-4" />,
    'Parking': <Car className="w-4 h-4" />,
    'AC': <span className="text-xs font-semibold">AC</span>,
    'Meals': <UtensilsCrossed className="w-4 h-4" />,
    'Security': <ShieldCheck className="w-4 h-4" />,
  };

  const images = property.images && property.images.length > 0
    ? property.images
    : [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      ];

  const amenities = property.amenities || [];

  const seoTitle = `${property.room_type ? property.room_type.toUpperCase() + ' ' : ''}${property.property_type === 'pg' ? 'PG / Hostel' : 'Flat/Apartment'} for Rent in ${property.locality}, Hyderabad | HydRent`;
  const seoDescription = `Verified ${property.property_type === 'pg' ? 'PG / co-living stay' : 'apartment'} at ${property.locality}, Hyderabad. Rent: ₹${property.rent.toLocaleString()}/month. Broker-free, direct owner verification, and premium amenities.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': property.property_type === 'pg' ? 'Accommodation' : 'Apartment',
    name: property.title,
    description: property.description || seoDescription,
    url: `${window.location.origin}/property/${property.id}`,
    image: images,
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.locality,
      addressRegion: 'Telangana',
      addressCountry: 'IN',
      addressLocalityName: 'Hyderabad',
    },
    geo: property.latitude && property.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: property.rent,
      priceCurrency: 'INR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: property.rent,
        priceCurrency: 'INR',
        unitText: 'MONTH'
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead 
        title={seoTitle} 
        description={seoDescription}
        jsonLd={jsonLd}
      />
      <Header />
      
      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/properties" className="hover:text-primary">Properties</Link>
            <span>/</span>
            <span className="text-foreground">{property.locality}</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="relative rounded-2xl overflow-hidden">
                <div className="aspect-video cursor-pointer" onClick={() => { setGalleryIndex(currentImageIndex); setShowGallery(true); }}>
                  <img
                    src={images[currentImageIndex]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>

                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={toggleFavorite}
                    className="w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <Heart className={cn("w-5 h-5", isFavorite && "fill-primary text-primary")} />
                  </button>
                  <button 
                    onClick={() => setShowShareDialog(true)}
                    className="w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="absolute top-4 left-4 flex gap-2">
                  {property.is_verified && (
                    <Badge className="bg-secondary text-secondary-foreground gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                  {ownerVerified && (
                    <Badge className="bg-green-500/90 text-white gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Owner
                    </Badge>
                  )}
                  {(property as any).is_direct_owner && (
                    <Badge className="bg-blue-500/90 text-white gap-1">
                      <Home className="w-3 h-3" />
                      Direct Owner
                    </Badge>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={cn(
                        "w-20 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors",
                        currentImageIndex === i ? "border-primary" : "border-transparent"
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Title & Location */}
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold">
                  {property.title}
                </h1>
                {property.address && (
                  property.latitude && property.longitude ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>{property.address}</span>
                      <span className="text-xs text-primary">(Get Directions)</span>
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{property.address}</span>
                    </p>
                  )
                )}
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Building2 className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{property.property_type}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Home className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Room</p>
                    <p className="font-medium uppercase">{property.room_type || 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Preference</p>
                    <p className="font-medium capitalize">{property.gender_preference || 'Any'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="font-medium">
                      {property.available_from
                        ? new Date(property.available_from).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                        : 'Now'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="rules">House Rules</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">About This Property</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {property.description || 'No description provided.'}
                      </p>
                    </CardContent>
                  </Card>

                  {property.latitude && property.longitude && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Location</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <iframe
                            title="Property Location"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01},${property.latitude - 0.01},${property.longitude + 0.01},${property.latitude + 0.01}&layer=mapnik&marker=${property.latitude},${property.longitude}`}
                          />
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2"
                        >
                          <Button variant="outline" className="gap-2">
                            <MapPin className="w-4 h-4" />
                            Get Directions in Google Maps
                          </Button>
                        </a>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="amenities" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {amenities.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {amenities.map((amenity) => (
                            <div key={amenity} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                {amenityIcons[amenity] || <Check className="w-4 h-4" />}
                              </div>
                              <span className="font-medium">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No amenities listed.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="rules" className="mt-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-3">
                        {property.pets_allowed ? (
                          <Check className="w-5 h-5 text-secondary" />
                        ) : (
                          <X className="w-5 h-5 text-destructive" />
                        )}
                        <span>Pets {property.pets_allowed ? 'Allowed' : 'Not Allowed'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {property.food_available ? (
                          <Check className="w-5 h-5 text-secondary" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span>Meals {property.food_available ? 'Included' : 'Not Included'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-accent" />
                        <span>No smoking inside the property</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <span>Entry closes at 11:00 PM</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-4">
              <ReviewSection propertyId={property.id} ownerId={property.owner_id} />
                </TabsContent>
              </Tabs>

              {/* Availability Calendar */}
              {property.available_from && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CalendarComponent
                      mode="single"
                      selected={new Date(property.available_from)}
                      className="rounded-md border pointer-events-auto"
                      disabled={(date) => {
                        const unavailable = ((property as any).unavailable_dates || []) as string[];
                        return unavailable.some(d => new Date(d).toDateString() === date.toDateString());
                      }}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Available from {new Date(property.available_from).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Report Property */}
              {user && user.id !== property.owner_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive gap-2"
                  onClick={() => setShowReportDialog(true)}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report this property
                </Button>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-24 shadow-elevated">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold">{formatPrice(property.rent)}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    
                    <div className="mt-4 space-y-2 text-sm">
                      {property.deposit != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Security Deposit</span>
                          <span className="font-medium">{formatPrice(property.deposit)}</span>
                        </div>
                      )}
                      {property.maintenance != null && property.maintenance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Maintenance</span>
                          <span className="font-medium">{formatPrice(property.maintenance)}/mo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button variant="hero" size="lg" className="w-full gap-2" onClick={handleContactOwner}>
                      <Phone className="w-4 h-4" />
                      Contact Owner
                    </Button>
                    <Button variant="outline" size="lg" className="w-full gap-2" onClick={handleSendMessage}>
                      <MessageCircle className="w-4 h-4" />
                      Send Message
                    </Button>
                    <Button variant="teal" size="lg" className="w-full gap-2" onClick={handleScheduleVisit}>
                      <Calendar className="w-4 h-4" />
                      Schedule Visit
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full gradient-hero flex items-center justify-center text-primary-foreground text-xl font-semibold">
                      {ownerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{ownerName}</p>
                      <p className="text-sm text-muted-foreground">Property Owner</p>
                      {property.is_verified && (
                        <Badge variant="secondary" className="mt-1 gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Contact Owner Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {ownerName}</DialogTitle>
            <DialogDescription>Owner contact details for "{property?.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-semibold text-lg">{ownerPhone || 'Not available'}</p>
              </div>
            </div>
            {ownerPhone && (
              <a href={`tel:${ownerPhone}`}>
                <Button className="w-full gap-2">
                  <Phone className="w-4 h-4" />
                  Call Now
                </Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>Message the owner about "{property?.title}"</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Write your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Cancel</Button>
            <Button onClick={handleSendMessageSubmit} disabled={!messageText.trim() || isSending}>
              {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><MessageCircle className="w-4 h-4 mr-2" />Send</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Visit Dialog */}
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a Visit</DialogTitle>
            <DialogDescription>Request a property visit for "{property?.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visit-date">Date</Label>
                <Input id="visit-date" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-time">Time</Label>
                <Input id="visit-time" type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-note">Note (optional)</Label>
              <Textarea id="visit-note" placeholder="Any special requests..." value={visitNote} onChange={(e) => setVisitNote(e.target.value)} rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVisitDialog(false)}>Cancel</Button>
            <Button onClick={handleScheduleVisitSubmit} disabled={!visitDate || !visitTime || isSending}>
              {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Calendar className="w-4 h-4 mr-2" />Request Visit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        propertyTitle={property.title}
        propertyId={property.id}
      />

      {/* Report Dialog */}
      <ReportPropertyDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        propertyId={property.id}
        propertyTitle={property.title}
      />

      {/* Fullscreen Gallery */}
      <ImageGallery
        images={images}
        initialIndex={galleryIndex}
        open={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </div>
  );
};

export default PropertyDetail;
