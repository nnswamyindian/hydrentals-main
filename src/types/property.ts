export type PropertyType = 'apartment' | 'house' | 'pg' | 'shared-room' | 'co-living' | 'villa' | 'coworking';
export type FurnishedStatus = 'furnished' | 'semi-furnished' | 'unfurnished';
export type GenderPreference = 'male' | 'female' | 'any';
export type RoomType = '1rk' | '1bhk' | '2bhk' | '3bhk' | '4bhk+' | 'single' | 'double' | 'triple';

export interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  roomType: RoomType;
  listingType?: 'rent' | 'sale';
  rent: number;
  salePrice?: number;
  deposit: number;
  maintenance?: number;
  locality: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  furnishedStatus: FurnishedStatus;
  amenities: string[];
  genderPreference: GenderPreference;
  foodAvailable: boolean;
  petsAllowed: boolean;
  availableFrom: string;
  images: string[];
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  isVerified: boolean;
  isDirectOwner?: boolean;
  ownerVerified?: boolean;
  distanceText?: string;
  rating?: number;
  reviewCount?: number;
  nearbyMetro?: string;
  metroDistance?: number;
  nearbyLandmarks?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface PropertyFilter {
  locality?: string;
  minBudget?: number;
  maxBudget?: number;
  propertyType?: PropertyType[];
  roomType?: RoomType[];
  furnishedStatus?: FurnishedStatus[];
  genderPreference?: GenderPreference;
  nearMetro?: boolean;
  petsAllowed?: boolean;
  foodAvailable?: boolean;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'tenant' | 'owner' | 'admin';
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  tenantId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message?: string;
  scheduledVisit?: string;
  createdAt: string;
}
