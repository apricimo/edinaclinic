import axios from 'axios';
import {
  Provider,
  Service,
  Category,
  Review,
  Booking,
  SearchFilters,
  BookingFormData,
  ReviewFormData
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token (future use)
api.interceptors.request.use(
  (config) => {
    // Add auth token when available
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Providers API
export const providersApi = {
  getAll: async (filters?: Partial<SearchFilters>) => {
    const response = await api.get('/providers', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Provider> => {
    const response = await api.get(`/providers/${id}`);
    return response.data;
  },
  
  create: async (provider: Omit<Provider, 'id' | 'rating' | 'reviewCount' | 'completedJobs' | 'verified'>) => {
    const response = await api.post('/providers', provider);
    return response.data;
  },
  
  update: async (id: string, updates: Partial<Provider>) => {
    const response = await api.put(`/providers/${id}`, updates);
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/providers/${id}`);
  }
};

// Services API
export const servicesApi = {
  getAll: async (filters?: Partial<SearchFilters>) => {
    const response = await api.get('/services', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Service> => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },
  
  getByProvider: async (providerId: string) => {
    const response = await api.get(`/services/provider/${providerId}`);
    return response.data;
  },
  
  create: async (service: Omit<Service, 'id' | 'rating' | 'reviewCount' | 'featured'>) => {
    const response = await api.post('/services', service);
    return response.data;
  },
  
  update: async (id: string, updates: Partial<Service>) => {
    const response = await api.put(`/services/${id}`, updates);
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/services/${id}`);
  }
};

// Categories API
export const categoriesApi = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  
  getById: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  }
};

// Reviews API
export const reviewsApi = {
  getAll: async (filters?: { serviceId?: string; providerId?: string; minRating?: number }) => {
    const response = await api.get('/reviews', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Review> => {
    const response = await api.get(`/reviews/${id}`);
    return response.data;
  },
  
  getStats: async (serviceId: string) => {
    const response = await api.get(`/reviews/service/${serviceId}/stats`);
    return response.data;
  },
  
  create: async (review: ReviewFormData) => {
    const response = await api.post('/reviews', review);
    return response.data;
  },
  
  update: async (id: string, updates: Partial<Review>) => {
    const response = await api.put(`/reviews/${id}`, updates);
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/reviews/${id}`);
  }
};

// Bookings API
export const bookingsApi = {
  getAll: async (filters?: { status?: string; providerId?: string; clientId?: string; serviceId?: string }) => {
    const response = await api.get('/bookings', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },
  
  create: async (booking: BookingFormData) => {
    const response = await api.post('/bookings', booking);
    return response.data;
  },
  
  update: async (id: string, updates: Partial<Booking>) => {
    const response = await api.put(`/bookings/${id}`, updates);
    return response.data;
  },
  
  cancel: async (id: string) => {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  }
};

export default api;
