export interface Provider {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  avatar: string;
  skills: string[];
  availability: 'available' | 'busy' | 'offline';
  verified: boolean;
  responseTime: string;
  completedJobs: number;
}

export interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  priceType: 'fixed' | 'hourly';
  duration: string;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
}

export interface Review {
  id: string;
  serviceId: string;
  providerId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

export interface Booking {
  id: string;
  serviceId: string;
  providerId: string;
  clientId: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  scheduledTime: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  location?: string;
  role: 'client' | 'provider';
  verified: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
}

export interface SearchFilters {
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  location?: string;
  availability?: string;
  sortBy?: 'price' | 'rating' | 'reviews' | 'newest';
  sortOrder?: 'asc' | 'desc';
}
