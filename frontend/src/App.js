import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Search, MapPin, Star, Clock, User, Calendar, Settings, Users, BookOpen, MessageSquare, ChevronLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react';

// Import new components
import CalendarBooking from './components/CalendarBooking.js';
import StripeCheckout from './components/StripeCheckout.js';
import VideoAppointment from './components/VideoAppointments.js';

// Live API URL
const API_BASE_URL = 'https://tpmsxaij6jknv55uxjxduj3kn40cnahc.lambda-url.us-east-1.on.aws';

// API functions
const api = {
  getServices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services`);
      const data = await response.json();
      return data.services || [];
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  },
  
  getProviders: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/providers`);
      const data = await response.json();
      return data.providers || [];
    } catch (error) {
      console.error('Error fetching providers:', error);
      return [];
    }
  },
  
  getCategories: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },
  
  createBooking: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  getBookings: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`);
      const data = await response.json();
      return data.bookings || [];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  }
};

// Header Component
const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-green-600">
              TeleHealth
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md">
              Services
            </Link>
            <Link to="/providers" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md">
              Providers
            </Link>
            <Link to="/bookings" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md">
              My Bookings
            </Link>
            <Link to="/admin" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md">
              Admin
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Main Services Page
const ServicesPage = ({ onServiceSelect }) => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, categoriesData] = await Promise.all([
          api.getServices(),
          api.getCategories()
        ]);
        
        setServices(servicesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading telehealth platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Healthcare at Your Fingertips
            </h1>
            <p className="text-xl mb-8 text-green-100">
              Connect with licensed healthcare professionals through secure video consultations
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="What health concern do you have?"
                    className="w-full pl-10 pr-4 py-3 text-gray-900 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button className="bg-orange-500 text-white px-8 py-3 rounded-r-lg hover:bg-orange-600 font-semibold">
                  Find Care
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Browse by Specialty</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
            >
              <div className="text-3xl mb-3">{category.icon}</div>
              <h3 className="font-semibold text-gray-900 text-sm">{category.name}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Available Services */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Available Now</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} onSelect={onServiceSelect} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ServiceCard Component
const ServiceCard = ({ service, onSelect }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🏥</div>
          <p className="text-sm text-gray-600">Video Consultation</p>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-blue-600 font-medium">{service.category}</span>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm text-gray-600">{service.rating}</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-600">${service.price}</span>
            <div className="text-sm text-gray-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {service.duration} mins
            </div>
          </div>
          <button
            onClick={() => onSelect(service)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

// Providers Page
const ProvidersPage = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const data = await api.getProviders();
        setProviders(data);
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProviders();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Healthcare Providers</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Provider Card Component
const ProviderCard = ({ provider }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {provider.name.split(' ')[1]?.charAt(0) || 'Dr'}
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm text-gray-600">
              {provider.rating} ({provider.reviewCount} reviews)
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{provider.description}</p>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center text-sm text-gray-500">
          <MapPin className="h-4 w-4 mr-1" />
          {provider.location}
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          {provider.responseTime}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {provider.specialties?.slice(0, 2).map((specialty, index) => (
          <span
            key={index}
            className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
          >
            {specialty}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-green-600">
          ${provider.hourlyRate}
        </span>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          View Profile
        </button>
      </div>
    </div>
  );
};

// Bookings Page
const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const data = await api.getBookings();
        setBookings(data);
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBookings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Appointments</h1>
        
        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments yet</h3>
            <p className="text-gray-600 mb-4">Book your first telehealth consultation</p>
            <Link to="/" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Browse Services
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Telehealth Consultation
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {booking.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.scheduledDate}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.scheduledTime}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${booking.totalAmount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-green-600 hover:text-green-900 mr-4">
                          Join Call
                        </button>
                        {booking.status === 'pending' && (
                          <button className="text-red-600 hover:text-red-900">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Admin Page
const AdminPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <p className="text-gray-600 mb-4">
            Admin functionality for managing telehealth services, providers, and appointments.
          </p>
          <div className="text-sm text-gray-500">
            API URL: {API_BASE_URL}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('services');
  const [selectedService, setSelectedService] = useState(null);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setCurrentView('booking');
  };

  if (currentView === 'booking' && selectedService) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => setCurrentView('services')}
            className="mb-4 text-green-600 hover:text-green-700 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            View all services
          </button>
          
          <CalendarBooking 
            service={selectedService}
            onBookingSelect={(appointmentData) => {
              // Handle booking completion
              console.log('Appointment booked:', appointmentData);
              setCurrentView('services');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <Routes>
          <Route path="/" element={<ServicesPage onServiceSelect={handleServiceSelect} />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
