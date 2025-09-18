import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Search, MapPin, Star, Clock, User, Calendar, Settings, Users, BookOpen, MessageSquare, ChevronLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react';

// Import new components
import CalendarBooking from './components/CalendarBooking.js';
import StripeCheckout from './components/StripeCheckout.js';
import VideoAppointment from './components/VideoAppointments.js';

// Mock data since backend isn't running
const mockCategories = [
  { id: 'primary-care', name: 'Primary Care', icon: '🏥' },
  { id: 'mental-health', name: 'Mental Health', icon: '🧠' },
  { id: 'dermatology', name: 'Dermatology', icon: '🩺' },
  { id: 'pediatrics', name: 'Pediatrics', icon: '👶' },
  { id: 'cardiology', name: 'Cardiology', icon: '❤️' },
  { id: 'endocrinology', name: 'Endocrinology', icon: '⚕️' },
  { id: 'neurology', name: 'Neurology', icon: '🧠' },
  { id: 'emergency', name: 'Urgent Care', icon: '🚨' }
];

const mockServices = [
  {
    id: '1',
    providerId: '1',
    title: 'Minnesota Rapid Care - Virtual',
    description: 'Quick 15 minute visit for common medical issues. Same day video visits for minor issues like cough, sore throat, sinus symptoms, rashes, uncomplicated UTIs, or medication questions.',
    category: 'Primary Care',
    subcategory: 'virtual-consultation',
    price: 99,
    priceType: 'fixed',
    duration: 15,
    images: ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400'],
    tags: ['same-day', 'video-call', 'licensed-physician'],
    rating: 4.9,
    reviewCount: 127,
    featured: true,
    availableSlots: ['8:15 PM', '8:30 PM', '8:45 PM', '9:00 PM', '9:15 PM', '9:30 PM', '9:45 PM', '10:00 PM', '10:15 PM', '10:30 PM', '10:45 PM']
  },
  {
    id: '2',
    providerId: '2',
    title: 'Mental Health Consultation',
    description: 'Professional mental health consultation with licensed therapist. Discuss anxiety, depression, stress management, and other mental health concerns.',
    category: 'Mental Health',
    subcategory: 'therapy',
    price: 150,
    priceType: 'fixed',
    duration: 30,
    images: ['https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=400'],
    tags: ['licensed-therapist', 'confidential', 'video-call'],
    rating: 4.8,
    reviewCount: 89,
    featured: true,
    availableSlots: ['10:00 AM', '2:00 PM', '4:00 PM', '6:00 PM']
  },
  {
    id: '3',
    providerId: '3',
    title: 'Dermatology Consultation',
    description: 'Virtual dermatology consultation for skin conditions, acne treatment, mole checks, and skincare recommendations.',
    category: 'Specialist',
    subcategory: 'dermatology',
    price: 200,
    priceType: 'fixed',
    duration: 45,
    images: ['https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400'],
    tags: ['skin-care', 'specialist', 'video-consultation'],
    rating: 4.7,
    reviewCount: 156,
    featured: false,
    availableSlots: ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM']
  }
];

const mockProviders = [
  {
    id: '1',
    name: 'Dr. Joseph Kumka, MD, PhD',
    description: 'Board-certified physician with 10+ years of experience in primary care and telehealth consultations.',
    category: 'Primary Care',
    rating: 4.9,
    reviewCount: 127,
    hourlyRate: 99,
    location: 'Minnesota',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150',
    skills: ['Primary Care', 'Telehealth', 'Urgent Care'],
    availability: 'available',
    verified: true,
    responseTime: '< 15 mins',
    completedJobs: 340,
    license: 'MD-MN-12345',
    specialties: ['Family Medicine', 'Internal Medicine']
  },
  {
    id: '2',
    name: 'Dr. Sarah Wilson, LCSW',
    description: 'Licensed clinical social worker specializing in anxiety, depression, and stress management therapy.',
    category: 'Mental Health',
    rating: 4.8,
    reviewCount: 89,
    hourlyRate: 150,
    location: 'Minnesota',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
    skills: ['Therapy', 'CBT', 'Anxiety Treatment'],
    availability: 'available',
    verified: true,
    responseTime: '< 30 mins',
    completedJobs: 156,
    license: 'LCSW-MN-67890',
    specialties: ['Cognitive Behavioral Therapy', 'Anxiety Disorders']
  },
  {
    id: '3',
    name: 'Dr. Michael Chen, MD',
    description: 'Board-certified dermatologist with expertise in virtual skin consultations and teledermatology.',
    category: 'Specialist',
    rating: 4.7,
    reviewCount: 203,
    hourlyRate: 200,
    location: 'Minnesota',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    skills: ['Dermatology', 'Skin Cancer Screening', 'Acne Treatment'],
    availability: 'busy',
    verified: true,
    responseTime: '< 1 hour',
    completedJobs: 289,
    license: 'MD-DERM-MN-11111',
    specialties: ['Medical Dermatology', 'Cosmetic Dermatology']
  }
];

const mockBookings = [
  {
    id: '1',
    serviceId: '1',
    providerId: '1',
    clientId: 'client1',
    status: 'confirmed',
    scheduledDate: '2025-09-20',
    scheduledTime: '10:00',
    totalAmount: 99,
    notes: 'Sore throat and cough symptoms',
    createdAt: '2025-09-17T10:00:00Z'
  },
  {
    id: '2',
    serviceId: '2',
    providerId: '2',
    clientId: 'client2',
    status: 'pending',
    scheduledDate: '2025-09-18',
    scheduledTime: '16:00',
    totalAmount: 150,
    notes: 'Anxiety management consultation',
    createdAt: '2025-09-17T08:30:00Z'
  }
];

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

// Main Services Page (replaces HomePage)
const ServicesPage = ({ onServiceSelect }) => {
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
          {mockCategories.map((category) => (
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
            {mockServices.map((service) => (
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
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Healthcare Providers</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockProviders.map((provider) => (
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
          src={provider.avatar}
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
                {mockBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {mockServices.find(s => s.id === booking.serviceId)?.title || 'Unknown Service'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {mockProviders.find(p => p.id === booking.providerId)?.name || 'Unknown Provider'}
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

// Admin Service Management Component
const AdminServiceManagement = () => {
  const [services, setServices] = useState(mockServices);
  const [isEditing, setIsEditing] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    duration: '',
    price: '',
    description: '',
    category: ''
  });

  const categories = ['Primary Care', 'Mental Health', 'Specialist', 'Emergency', 'Consultation'];

  const handleEdit = (service) => {
    setIsEditing(service.id);
    setEditForm({
      title: service.title,
      duration: service.duration,
      price: service.price,
      description: service.description,
      category: service.category
    });
  };

  const handleSave = () => {
    if (isEditing) {
      setServices(services.map(service => 
        service.id === isEditing 
          ? { ...service, ...editForm, duration: parseInt(editForm.duration), price: parseFloat(editForm.price) }
          : service
      ));
    } else {
      const newService = {
        id: Date.now().toString(),
        ...editForm,
        duration: parseInt(editForm.duration),
        price: parseFloat(editForm.price),
        providerId: '1',
        rating: 0,
        reviewCount: 0,
        featured: false,
        availableSlots: ['8:15 PM', '8:30 PM', '8:45 PM', '9:00 PM']
      };
      setServices([...services, newService]);
    }
    
    setIsEditing(null);
    setShowAddForm(false);
    setEditForm({ title: '', duration: '', price: '', description: '', category: '' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      setServices(services.filter(service => service.id !== id));
    }
  };

  const handleCancel = () => {
    setIsEditing(null);
    setShowAddForm(false);
    setEditForm({ title: '', duration: '', price: '', description: '', category: '' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Service Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Service
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || isEditing) && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium mb-4">
            {isEditing ? 'Edit Service' : 'Add New Service'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Name *
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter service name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={editForm.duration}
                onChange={(e) => setEditForm({...editForm, duration: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="15"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="99.00"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter service description"
            />
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="p-6">
        <div className="grid gap-4">
          {services.map((service) => (
            <div key={service.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {service.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mb-3 text-sm text-gray-600">
                    <span>{service.duration} mins</span>
                    <span className="font-semibold text-green-600">${service.price}</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{service.description}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Admin Page
const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('services');

  const tabs = [
    { id: 'services', name: 'Services', icon: BookOpen },
    { id: 'providers', name: 'Providers', icon: Users },
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
            {activeTab === 'services' && <AdminServiceManagement />}
            
            {activeTab !== 'services' && (
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

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('services');
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
    
    // Auto-start video call for demonstration
    setTimeout(() => {
      setShowVideoCall(true);
    }, 3000);
  };

  const handleEndCall = () => {
    setShowVideoCall(false);
    setCurrentView('services');
    // Reset state
    setSelectedService(null);
    setSelectedAppointment(null);
    setCompletedBooking(null);
  };

  // Render different views
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
            onClick={() => setCurrentView('services')}
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
              onClick={() => setCurrentView('services')}
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
