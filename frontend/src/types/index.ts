// Re-export shared types
export * from '../../../shared/types';

// Frontend-specific types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchParams {
  query?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  availability?: string;
  sortBy?: 'price' | 'rating' | 'reviews' | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BookingFormData {
  serviceId: string;
  providerId: string;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
}

export interface ReviewFormData {
  serviceId: string;
  providerId: string;
  rating: number;
  comment: string;
}
