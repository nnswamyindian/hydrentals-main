import { Property } from '@/types/property';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Train, 
  Heart, 
  Star,
  Home,
  Users,
  Wifi,
  UtensilsCrossed,
  ShieldCheck,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PropertyCardProps {
  property: Property;
  className?: string;
}

const PropertyCard = ({ property, className }: PropertyCardProps) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkFav = async () => {
      const { data } = await (supabase as any)
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', property.id)
        .maybeSingle();
      if (data) setIsFavorite(true);
    };
    checkFav();
  }, [user, property.id]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }
    try {
      if (isFavorite) {
        await (supabase as any)
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', property.id);
        setIsFavorite(false);
      } else {
        await (supabase as any)
          .from('favorites')
          .insert({ user_id: user.id, property_id: property.id });
        setIsFavorite(true);
      }
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    }
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)}L`;
    }
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const isSale = property.listingType === 'sale';

  const propertyTypeLabels: Record<string, string> = {
    'apartment': 'Apartment',
    'house': 'House',
    'pg': 'PG',
    'shared-room': 'Shared Room',
    'co-living': 'Co-Living',
    'villa': 'Villa',
  };

  const furnishedLabels: Record<string, string> = {
    'furnished': 'Furnished',
    'semi-furnished': 'Semi-Furnished',
    'unfurnished': 'Unfurnished',
  };

  return (
    <div 
      className={cn(
        "group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300",
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 gradient-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs font-medium">
            {propertyTypeLabels[property.propertyType]}
          </Badge>
          {isSale && (
            <Badge className="bg-accent text-accent-foreground">
              For Sale
            </Badge>
          )}
        {property.isVerified && (
            <Badge className="bg-secondary text-secondary-foreground gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </Badge>
          )}
          {property.ownerVerified && (
            <Badge className="bg-green-500/90 text-white gap-1 text-xs">
              <ShieldCheck className="w-3 h-3" />
              Verified Owner
            </Badge>
          )}
          {property.isDirectOwner && (
            <Badge className="bg-blue-500/90 text-white gap-1 text-xs">
              <Home className="w-3 h-3" />
              Direct Owner
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite();
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
        >
          <Heart 
            className={cn(
              "w-4 h-4 transition-colors",
              isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
            )} 
          />
        </button>

        {/* Price Tag */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="bg-background/95 backdrop-blur-sm rounded-xl px-3 py-2">
            <p className="text-lg font-bold text-foreground">
              {isSale && property.salePrice
                ? formatPrice(property.salePrice)
                : formatPrice(property.rent)}
              <span className="text-sm font-normal text-muted-foreground">
                {isSale ? '' : '/mo'}
              </span>
            </p>
          </div>
          {property.rating && (
            <div className="bg-background/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-accent text-accent" />
              <span className="text-sm font-medium">{property.rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Location */}
        <div>
          <Link to={`/property/${property.id}`}>
            <h3 className="font-display font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            {property.latitude && property.longitude ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{property.locality}, {property.city}</span>
              </a>
            ) : (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{property.locality}, {property.city}</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>{property.roomType.toUpperCase()}</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{furnishedLabels[property.furnishedStatus]}</span>
          {property.metroDistance && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1">
                <Train className="w-3.5 h-3.5" />
                <span>{property.metroDistance}km</span>
              </div>
            </>
          )}
          {property.distanceText && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1 text-primary">
                <Navigation className="w-3 h-3" />
                <span>{property.distanceText}</span>
              </div>
            </>
          )}
        </div>

        {/* Features */}
        <div className="flex items-center gap-2 flex-wrap">
          {property.amenities.slice(0, 3).map((amenity) => (
            <Badge key={amenity} variant="outline" className="text-xs font-normal py-0.5">
              {amenity}
            </Badge>
          ))}
          {property.amenities.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal py-0.5">
              +{property.amenities.length - 3}
            </Badge>
          )}
        </div>

        {/* Bottom Icons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            {property.genderPreference !== 'any' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span className="capitalize">{property.genderPreference}</span>
              </div>
            )}
            {property.foodAvailable && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Meals</span>
              </div>
            )}
            {property.amenities.includes('WiFi') && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wifi className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <Link to={`/property/${property.id}`}>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary">
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
