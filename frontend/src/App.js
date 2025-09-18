import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Clock, User, Calendar, Settings, Home, Users, BookOpen, MessageSquare, ChevronLeft } from 'lucide-react';

// Import new components
import CalendarBooking from './components/CalendarBooking';
import StripeCheckout from './components/StripeCheckout';
import VideoAppointment from './components/VideoAppointment';

// Updated API functions for telehealth
const api = {
  getProviders: async () => {
    const response = await fetch('/api/providers');
    return response.json();
  },
  getServices: async () => {
    const response = await fetch('/api/services');
    return response.json();
  },
  getCategories: async () => {
    // Update categories for telehealth
    return {
      categories: [
        { id: 'primary-care', name: 'Primary Care', icon: '🏥' },
        { id: 'mental-health', name: 'Mental Health', icon: '🧠' },
        { id: 'dermatology', name: 'Dermatology', icon: '🩺' },
        { id: 'pediatrics', name: 'Pediatrics', icon: '👶' },
        { id: 'cardiology', name: 'Cardiology', icon: '❤️' },
        { id: 'endocrinology', name: 'Endocrinology', icon: '⚕️' },
        { id: 'neurology', name: 'Neurology', icon: '🧠' },
        { id: 'emergency', name: 'Urgent Care', icon: '🚨' }
      ]
    };
  },
  getBookings: async () => {
    const response = await fetch('/api/bookings');
    return response.json();
  },
  createBooking: async (booking) => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });
    return response.json();
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
              Home
            </Link>
            <Link to="/services" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md">
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

// HomePage Component - Updated for telehealth
const HomePage = ({ onServiceSelect }) => {
  const [categories, setCategories] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, servicesData] = await Promise.all([
          api.getCategories(),
          api.getServices()
        ]);
        setCategories(categoriesData.categories || []);
        setFeaturedServices(servicesData.services?.filter(s => s.featured) || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Updated for telehealth */}
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

      {/* Featured Services */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Available Now</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredServices.map((service) => (
              <ServiceCard key={service.id} service={service} onSelect={onServiceSelect} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ServiceCard Component - Updated for telehealth
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

// Services Page
const ServicesPage = ({ onServiceSelect }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await api.getServices();
        setServices(data.services || []);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">All Healthcare Services</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} onSelect={onServiceSelect} />
          ))}
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
        setProviders(data.providers || []);
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProviders();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
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
        <img
          src={provider.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
          alt={provider.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm text-gray-600">
              {provider.rating} ({provider.reviewCount} reviews)
            </span>
          </div>
          {provider.license && (
            <p className="text-xs text-gray-500">License: {provider.license}</p>
          )}
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
        {provider.skills?.slice(0, 3).map((skill, index) => (
          <span
            key={index}
            className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
          >
            {skill}
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
        setBookings(data.bookings || []);
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Appointments</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
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
                        Service #{booking.serviceId}
                      </div>
                      <div className="text-sm text-gray-500">
                        Provider #{booking.providerId}
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
      </div>
    </div>
  );
};

// Admin Page
const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalProviders: 0,
    totalServices: 0,
    totalBookings: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    // Load admin stats
    const loadStats = async () => {
      try {
        const [providers, services, bookings] = await Promise.all([
          api.getProviders(),
          api.getServices(),
          api.getBookings()
        ]);
        
        setStats({
          totalProviders: providers.providers?.length || 0,
          totalServices: services.services?.length || 0,
          totalBookings: bookings.bookings?.length || 0,
          totalRevenue: bookings.bookings?.reduce((sum, b) => sum + (b.totalAmount || 0), 0) || 0
        });
      } catch (error) {
        console.error('Error loading admin stats:', error);
      }
    };
    loadStats();
  }, []);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Home },
    { id: 'providers', name: 'Providers', icon: Users },
    { id: 'services', name: 'Services', icon: BookOpen },
    { id: 'bookings', name: 'Bookings', icon: Calendar },
    { id: 'reviews', name: 'Reviews', icon: MessageSquare },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-6 mr-8">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Providers</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalProviders}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <BookOpen className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Services</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <Calendar className="h-8 w-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">$</div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <p className="text-gray-500">Recent telehealth appointments and bookings will appear here.</p>
                </div>
              </div>
            )}

            {activeTab !== 'overview' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {tabs.find(t => t.id === activeTab)?.name} Management
                </h3>
                <p className="text-gray-500">
                  {activeTab} management interface for telehealth platform would go here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component with telehealth booking flow
function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setCurrentView('booking');
  };

  const handleBookingSelect = (appointmentData) => {
    setSelectedAppointment(appointmentData);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = (bookingData) => {
    setShowCheckout(false);
    setCompletedBooking(bookingData);
    setCurrentView('confirmation');
    
    // Auto-start video call for demonstration (in real app, this would be scheduled)
    setTimeout(() => {
      setShowVideoCall(true);
    }, 3000);
  };

  const handleEndCall = () => {
    setShowVideoCall(false);
    setCurrentView('home');
    // Reset state
    setSelectedService(null);
    setSelectedAppointment(null);
    setCompletedBooking(null);
  };

  // Render different views based on currentView state
  if (showVideoCall && completedBooking) {
    return (
      <VideoAppointment 
        appointment={completedBooking}
        onEndCall={handleEndCall}
      />
    );
  }

  if (currentView === 'booking' && selectedService) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <button
            onClick={() => setCurrentView('home')}
            className="mb-4 text-green-600 hover:text-green-700 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            View all services
          </button>
          
          <CalendarBooking 
            service={selectedService}
            onBookingSelect={handleBookingSelect}
          />
          
          {showCheckout && selectedAppointment && (
            <StripeCheckout
              service={selectedService}
              appointment={selectedAppointment}
              onClose={() => setShowCheckout(false)}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'confirmation' && completedBooking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Your telehealth appointment has been successfully booked.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2">Appointment Details:</h3>
              <p><strong>Service:</strong> {completedBooking.service.title}</p>
              <p><strong>Date & Time:</strong> {completedBooking.appointment.date} at {completedBooking.appointment.time}</p>
              <p><strong>Duration:</strong> {completedBooking.service.duration} minutes</p>
              <p><strong>Amount Paid:</strong> ${completedBooking.payment.amount}</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>What's Next?</strong> You'll receive a confirmation email with your appointment details and video call link. 
                The video call will start automatically at your appointment time.
              </p>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Starting video call in 3 seconds for demonstration...
            </p>
            
            <button
              onClick={() => setCurrentView('home')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Return to Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <Routes>
          <Route path="/" element={<HomePage onServiceSelect={handleServiceSelect} />} />
          <Route path="/services" element={<ServicesPage onServiceSelect={handleServiceSelect} />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
