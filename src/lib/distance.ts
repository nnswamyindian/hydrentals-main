// Haversine formula to calculate distance between two coordinates in km
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  type: 'tech-park' | 'metro' | 'college' | 'hospital';
}

export const hyderabadLandmarks: Landmark[] = [
  { name: 'HITEC City', lat: 17.4435, lng: 78.3772, type: 'tech-park' },
  { name: 'Gachibowli', lat: 17.4401, lng: 78.3489, type: 'tech-park' },
  { name: 'Financial District', lat: 17.4225, lng: 78.3413, type: 'tech-park' },
  { name: 'Raidurg Metro', lat: 17.4383, lng: 78.3862, type: 'metro' },
  { name: 'Miyapur Metro', lat: 17.4965, lng: 78.3537, type: 'metro' },
  { name: 'Ameerpet Metro', lat: 17.4375, lng: 78.4483, type: 'metro' },
  { name: 'JNTU', lat: 17.4933, lng: 78.3916, type: 'college' },
  { name: 'IIIT Hyderabad', lat: 17.4454, lng: 78.3484, type: 'college' },
  { name: 'Apollo Hospital', lat: 17.4234, lng: 78.4539, type: 'hospital' },
  { name: 'KIMS Hospital', lat: 17.4175, lng: 78.4748, type: 'hospital' },
];

export function getNearestLandmark(
  lat: number,
  lng: number,
  landmarks: Landmark[] = hyderabadLandmarks
): { landmark: Landmark; distance: number } | null {
  if (!lat || !lng) return null;
  let nearest: { landmark: Landmark; distance: number } | null = null;
  for (const lm of landmarks) {
    const d = haversineDistance(lat, lng, lm.lat, lm.lng);
    if (!nearest || d < nearest.distance) {
      nearest = { landmark: lm, distance: d };
    }
  }
  return nearest;
}
