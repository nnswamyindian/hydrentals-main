import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import BecomeOwnerCard from './BecomeOwnerCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PropertyCard from '@/components/property/PropertyCard';
import { Property } from '@/types/property';
import SavedSearchesList from './SavedSearchesList';
import RecentlyViewedSection from './RecentlyViewedSection';
import VisitRequestsList from './VisitRequestsList';
import {
  Search,
  Heart,
  MapPin,
  Home,
  LayoutDashboard,
  Bell,
  Settings,
  ArrowRight,
  Building2,
  TrendingUp,
  MessageSquare,
  User,
  CheckCircle,
  Star,
  Calculator,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, active: true },
  { name: 'Search Properties', href: '/properties', icon: <Search className="w-5 h-5" /> },
  { name: 'Favorites', href: '/favorites', icon: <Heart className="w-5 h-5" /> },
  { name: 'Messages', href: '/messages', icon: <MessageSquare className="w-5 h-5" /> },
  { name: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
];

interface Favorite {
  id: string;
  property_id: string;
}

interface Notification {
  id: string;
  title: string;
  message?: string;
  body?: string;
  is_read: boolean;
  created_at: string;
}

// Type-safe wrapper for supabase queries until types are regenerated
const db = supabase as any;

const TenantDashboard = () => {
  const { profile, roles } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [favoritesRes, notificationsRes] = await Promise.all([
          db.from('favorites').select('id, property_id').limit(5),
          db.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(5),
        ]);

        if (favoritesRes.data) {
          setFavorites(favoritesRes.data as Favorite[]);
          const propertyIds = (favoritesRes.data as Favorite[]).map(f => f.property_id);
          if (propertyIds.length > 0) {
            const { data: props } = await db
              .from('properties')
              .select('*, profiles:owner_id(full_name)')
              .in('id', propertyIds)
              .limit(3);
            if (props) {
              setFavoriteProperties((props as any[]).map((p: any) => ({
                id: p.id,
                title: p.title,
                description: p.description || '',
                propertyType: p.property_type,
                roomType: p.room_type || '1bhk',
                rent: p.rent,
                deposit: p.deposit || 0,
                locality: p.locality,
                address: p.address || '',
                city: p.city || 'Hyderabad',
                pincode: p.pincode || '',
                latitude: p.latitude || 0,
                longitude: p.longitude || 0,
                furnishedStatus: p.furnished_status || 'unfurnished',
                amenities: p.amenities || [],
                genderPreference: p.gender_preference || 'any',
                foodAvailable: p.food_available || false,
                petsAllowed: p.pets_allowed || false,
                availableFrom: p.available_from || '',
                images: p.images || [],
                ownerId: p.owner_id,
                ownerName: p.profiles?.full_name || 'Owner',
                isVerified: p.is_verified || false,
                createdAt: p.created_at,
              })));
            }
          }
        }
        if (notificationsRes.data) setNotifications(notificationsRes.data as Notification[]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: 'Saved Properties', value: favorites.length, icon: Heart, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
    { label: 'Recent Searches', value: 12, icon: Search, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Unread Messages', value: notifications.length, icon: MessageSquare, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  ];

  const isAlsoOwner = roles.includes('owner');

  return (
    <DashboardLayout title="Tenant Dashboard" subtitle={`Welcome back, ${profile?.full_name || 'Tenant'}!`} navigation={navigation}>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
                <User className="w-7 h-7 text-blue-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  Tenant Account
                  {profile?.is_verified && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </h2>
                <p className="text-muted-foreground">
                  Find your perfect home in Hyderabad with thousands of verified listings.
                </p>
              </div>
              {isAlsoOwner && (
                <Badge variant="secondary" className="hidden sm:flex">
                  <Building2 className="w-3 h-3 mr-1" />
                  Also an Owner
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Become Owner CTA - Only show if not already an owner */}
        {!isAlsoOwner && <BecomeOwnerCard />}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Find your perfect home in Hyderabad</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-primary/5 hover:border-primary/30">
              <Link to="/properties">
                <Search className="w-6 h-6 text-primary" />
                <div className="text-center">
                  <span className="font-semibold block">Search Properties</span>
                  <span className="text-xs text-muted-foreground">Browse all listings</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-green-500/5 hover:border-green-500/30">
              <Link to="/map">
                <MapPin className="w-6 h-6 text-green-500" />
                <div className="text-center">
                  <span className="font-semibold block">Map View</span>
                  <span className="text-xs text-muted-foreground">Explore by location</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-rose-500/5 hover:border-rose-500/30">
              <Link to="/favorites">
                <Heart className="w-6 h-6 text-rose-500" />
                <div className="text-center">
                  <span className="font-semibold block">My Favorites</span>
                  <span className="text-xs text-muted-foreground">{favorites.length} saved</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-6 flex-col gap-3 hover:bg-purple-500/5 hover:border-purple-500/30">
              <Link to="/rent-calculator">
                <Calculator className="w-6 h-6 text-purple-500" />
                <div className="text-center">
                  <span className="font-semibold block">Rent Calculator</span>
                  <span className="text-xs text-muted-foreground">Check affordability</span>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Wishlist Preview */}
        {favoriteProperties.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  My Wishlist
                </CardTitle>
                <CardDescription>Properties you've saved</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/favorites">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {favoriteProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Recent Notifications
              </CardTitle>
              <CardDescription>Stay updated with the latest</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/notifications">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6">
                <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">No new notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <Bell className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.body || notification.message}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">New</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Searches */}
        <SavedSearchesList />

        {/* Recently Viewed */}
        <RecentlyViewedSection />

        {/* Visit Requests */}
        <VisitRequestsList role="tenant" />

        {/* Trending Localities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trending Localities
            </CardTitle>
            <CardDescription>Popular areas in Hyderabad right now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'HITEC City', hot: true },
                { name: 'Gachibowli', hot: true },
                { name: 'Madhapur', hot: false },
                { name: 'Kondapur', hot: false },
                { name: 'Jubilee Hills', hot: false },
                { name: 'Banjara Hills', hot: false },
                { name: 'Kukatpally', hot: false },
                { name: 'Miyapur', hot: false },
              ].map((locality) => (
                <Button key={locality.name} variant="secondary" size="sm" asChild className="gap-1">
                  <Link to={`/properties?locality=${encodeURIComponent(locality.name)}`}>
                    <MapPin className="w-3 h-3" />
                    {locality.name}
                    {locality.hot && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TenantDashboard;
