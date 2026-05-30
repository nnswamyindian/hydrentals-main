import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapProperty {
  id: string;
  title: string;
  locality: string;
  rent: number;
  room_type: string;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
}

interface PropertyMapProps {
  properties: MapProperty[];
}

const PropertyMap = ({ properties }: PropertyMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([17.4, 78.4], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for properties with coordinates
    const mappable = properties.filter(p => p.latitude && p.longitude);
    const coords: L.LatLngTuple[] = [];

    mappable.forEach((property) => {
      const lat = property.latitude!;
      const lng = property.longitude!;
      coords.push([lat, lng]);

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`
        <div style="min-width:180px">
          <a href="/property/${property.id}" style="font-weight:600;font-size:14px;text-decoration:none;color:#333;">
            ${property.title}
          </a>
          <p style="font-size:12px;color:#888;margin:4px 0 0;">${property.locality}</p>
          <p style="font-weight:700;font-size:14px;margin:4px 0 0;">₹${property.rent.toLocaleString('en-IN')}/mo</p>
          <span style="display:inline-block;margin-top:4px;font-size:10px;background:#f3f4f6;padding:2px 6px;border-radius:4px;">
            ${property.room_type?.toUpperCase() || 'N/A'}
          </span>
        </div>
      `);
    });

    // Fit bounds if we have coordinates
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    return () => {};
  }, [properties]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />;
};

export default PropertyMap;
