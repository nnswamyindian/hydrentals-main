import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Crosshair, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MapLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  locality?: string;
}

// Known localities in Hyderabad with their approximate coordinates and radius (km)
const hyderabadLocalities: Record<string, { lat: number; lng: number; radiusKm: number }> = {
  'HITEC City': { lat: 17.4435, lng: 78.3772, radiusKm: 3 },
  'Gachibowli': { lat: 17.4401, lng: 78.3489, radiusKm: 3 },
  'Madhapur': { lat: 17.4484, lng: 78.3908, radiusKm: 3 },
  'Kondapur': { lat: 17.4551, lng: 78.3538, radiusKm: 3 },
  'Jubilee Hills': { lat: 17.4325, lng: 78.4073, radiusKm: 4 },
  'Banjara Hills': { lat: 17.4156, lng: 78.4347, radiusKm: 4 },
  'Kukatpally': { lat: 17.4849, lng: 78.4138, radiusKm: 4 },
  'Miyapur': { lat: 17.4969, lng: 78.3533, radiusKm: 3 },
  'Ameerpet': { lat: 17.4375, lng: 78.4483, radiusKm: 2 },
  'SR Nagar': { lat: 17.4399, lng: 78.4445, radiusKm: 2 },
  'Begumpet': { lat: 17.4411, lng: 78.4667, radiusKm: 3 },
  'Secunderabad': { lat: 17.4399, lng: 78.4983, radiusKm: 5 },
  'LB Nagar': { lat: 17.3457, lng: 78.5478, radiusKm: 3 },
  'Dilsukhnagar': { lat: 17.3688, lng: 78.5247, radiusKm: 3 },
  'Uppal': { lat: 17.3991, lng: 78.5593, radiusKm: 3 },
  'Manikonda': { lat: 17.4052, lng: 78.3888, radiusKm: 3 },
  'Nallagandla': { lat: 17.4556, lng: 78.3126, radiusKm: 3 },
  'Kompally': { lat: 17.5353, lng: 78.4869, radiusKm: 4 },
  'Shamshabad': { lat: 17.2403, lng: 78.4294, radiusKm: 5 },
  'Chandanagar': { lat: 17.4893, lng: 78.3268, radiusKm: 3 },
};

// Haversine distance in km
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Hyderabad bounding box (generous)
const HYDERABAD_BOUNDS = {
  minLat: 17.1,
  maxLat: 17.7,
  minLng: 78.1,
  maxLng: 78.8,
};

const MapLocationPicker = ({ latitude, longitude, onLocationChange, locality }: MapLocationPickerProps) => {
  const { toast } = useToast();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [spoofWarning, setSpoofWarning] = useState<string | null>(null);
  const [locationVerified, setLocationVerified] = useState(false);

  const validateLocation = (lat: number, lng: number, accuracy: number): string | null => {
    // Check if within Hyderabad bounds
    if (
      lat < HYDERABAD_BOUNDS.minLat ||
      lat > HYDERABAD_BOUNDS.maxLat ||
      lng < HYDERABAD_BOUNDS.minLng ||
      lng > HYDERABAD_BOUNDS.maxLng
    ) {
      return 'Location appears to be outside Hyderabad. HydRent only supports properties in Hyderabad.';
    }

    // Check GPS accuracy — spoofed locations often have suspiciously perfect accuracy
    if (accuracy === 0) {
      return 'GPS accuracy is suspiciously perfect (0m). This may indicate a spoofed location. Please use your real GPS.';
    }

    // Very low accuracy (high number) could mean indoor/VPN but we allow up to 500m
    if (accuracy > 500) {
      return 'GPS accuracy is too low. Please go to an open area or enable high-accuracy location mode.';
    }

    return null;
  };

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);
    setSpoofWarning(null);
    setLocationVerified(false);

    // Take multiple readings to detect inconsistency (anti-spoof measure)
    const readings: { lat: number; lng: number; accuracy: number }[] = [];

    const takeReading = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            let message = 'Failed to get location';
            if (error.code === error.PERMISSION_DENIED) {
              message = 'Location permission denied. Please enable location access.';
            }
            reject(new Error(message));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      });
    };

    try {
      // Take 2 rapid readings to check consistency
      const reading1 = await takeReading();
      readings.push(reading1);

      // Small delay then take another reading
      await new Promise((r) => setTimeout(r, 500));
      const reading2 = await takeReading();
      readings.push(reading2);

      // Check if readings are wildly different (possible spoof switching)
      const drift = haversineDistance(reading1.lat, reading1.lng, reading2.lat, reading2.lng);
      if (drift > 1) {
        // More than 1km drift in 500ms = likely spoofing
        setSpoofWarning(
          'Location readings are inconsistent (jumped over 1km). Fake GPS apps are not allowed. Your account may be flagged.'
        );
        setIsGettingLocation(false);
        return;
      }

      // Use the more accurate reading
      const bestReading = reading1.accuracy <= reading2.accuracy ? reading1 : reading2;
      const { lat, lng, accuracy } = bestReading;

      setGpsAccuracy(accuracy);

      // Validate the location
      const warning = validateLocation(lat, lng, accuracy);
      if (warning) {
        setSpoofWarning(warning);
        setIsGettingLocation(false);
        return;
      }

      onLocationChange(lat, lng);
      setLocationVerified(true);
      toast({
        title: 'Location verified! ✅',
        description: `GPS coordinates captured with ${accuracy.toFixed(0)}m accuracy.`,
      });
    } catch (error: any) {
      toast({
        title: 'Location Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGettingLocation(false);
    }
  }, [onLocationChange, toast]);

  // Find nearest known locality
  const nearestLocality =
    latitude && longitude
      ? Object.entries(hyderabadLocalities).reduce(
          (nearest, [name, coords]) => {
            const dist = haversineDistance(latitude, longitude, coords.lat, coords.lng);
            return dist < nearest.distance ? { name, distance: dist } : nearest;
          },
          { name: '', distance: Infinity }
        )
      : null;

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4" />
          Property Location (GPS Verified)
        </Label>
        <p className="text-sm text-muted-foreground mb-3">
          You must capture your location from the property site. Manual input is disabled to prevent fake listings.
        </p>
      </div>

      {/* Anti-spoof notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">GPS Verification Active</p>
              <p className="text-muted-foreground mt-1">
                HydRent verifies your GPS location to ensure authentic property listings. 
                Fake GPS apps will be detected, and violations may result in account suspension.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spoofing Warning */}
      {spoofWarning && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Location Verification Failed</p>
                <p className="text-destructive/80 mt-1">{spoofWarning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Get Current Location */}
      <Button
        type="button"
        variant="secondary"
        onClick={getCurrentLocation}
        disabled={isGettingLocation}
        className="w-full gap-2"
      >
        {isGettingLocation ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Crosshair className="w-4 h-4" />
        )}
        {isGettingLocation ? 'Verifying Location...' : 'Capture GPS Location from This Device'}
      </Button>

      {/* Locality Fallback */}
      {!latitude && !longitude && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            💡 GPS may not work in browser preview. On the published app, GPS will work normally. 
            You can also use locality coordinates as a fallback:
          </p>
          {locality && hyderabadLocalities[locality] ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                const loc = hyderabadLocalities[locality];
                onLocationChange(loc.lat, loc.lng);
                toast({
                  title: 'Locality coordinates set',
                  description: `Using center coordinates for ${locality}. For precise location, use GPS on the published app.`,
                });
              }}
            >
              <MapPin className="w-4 h-4" />
              Use {locality} Center Coordinates
            </Button>
          ) : (
            <Select onValueChange={(name) => {
              const loc = hyderabadLocalities[name];
              if (loc) {
                onLocationChange(loc.lat, loc.lng);
                toast({
                  title: 'Locality coordinates set',
                  description: `Using center coordinates for ${name}.`,
                });
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select locality for coordinates" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(hyderabadLocalities).map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Current Location Display */}
      {latitude && longitude && (
        <div
          className={`p-3 border rounded-lg ${
            locationVerified
              ? 'bg-secondary/20 border-secondary/30'
              : 'bg-muted border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            {locationVerified ? (
              <ShieldCheck className="w-4 h-4 text-primary" />
            ) : (
              <MapPin className="w-4 h-4 text-primary" />
            )}
            <span className="font-medium">
              {locationVerified ? 'Location Verified ✅' : 'Location Set'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
            {gpsAccuracy !== null && ` • Accuracy: ${gpsAccuracy.toFixed(0)}m`}
          </p>
          {nearestLocality && nearestLocality.distance < 10 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              📍 Near: {nearestLocality.name} ({nearestLocality.distance.toFixed(1)} km)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MapLocationPicker;