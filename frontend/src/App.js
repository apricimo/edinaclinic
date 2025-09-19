import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Search, MapPin, Star, Clock, ChevronLeft, Calendar, Video } from 'lucide-react';

// Live API URL
const API_BASE_URL = 'https://qdvn4hezlzp6fyzwiw4hml2bqq0sayqf.lambda-url.us-east-1.on.aws/api';

// Header Component
const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-green-600">
            TeleHealth
          </Link>
          <nav className="flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-green-600">Services</Link>
            <Link to="/bookings" className="text-gray-700 hover:text-green-600">My Bookings</Link>
            <Link to="/admin" className="text-gray-700 hover:text-green-600">Admin</Link>
          </nav>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};

// Service Selection Page (Main)
const ServiceSelection = ({ onServiceSelect }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/services`);
        const data = await response.json();
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading telehealth services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Book Your Telehealth Visit</h1>
          <p className="text-xl mb-8">Connect with licensed healthcare professionals</p>
        </div>
      </div>

      {/* Services List */}
      <div className="max-w-4xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Select a Service</h2>
        <div className="space-y-6">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="bg-white rounded-xl shadow-lg border p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => onServiceSelect(service)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex items-center gap-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {service.category}
                    </span>
                    <div className="flex items-center text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="ml-1 text-gray-700">{service.rating} ({service.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">${service.price}</div>
                  <div className="text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.duration} mins
                  </div>
                  <button className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                    Select Service
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

// Calendar Booking Component
const CalendarBooking = ({ service, onTimeSelect }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');

  const availableSlots = service.availableSlots || ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

  const handleBooking = () => {
    if (selectedTime) {
      onTimeSelect({
        service,
        date: selectedDate,
        time: selectedTime
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Select Date & Time</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
          <p className="text-gray-600">${service.price} • {service.duration} minutes</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Available Times</label>
          <div className="grid grid-cols-3 gap-3">
            {availableSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`p-3 text-sm border rounded-lg transition-colors ${
                  selectedTime === slot
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleBooking}
          disabled={!selectedTime}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
};

// Stripe Checkout Component
const StripeCheckout = ({ appointment, onPaymentSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const handlePayment = async () => {
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      
      // Create booking in backend
      const bookingData = {
        serviceId: appointment.service.id,
        providerId: appointment.service.providerId,
        clientId: 'client-' + Date.now(),
        scheduledDate: appointment.date,
        scheduledTime: appointment.time,
        totalAmount: appointment.service.price,
        notes: `${appointment.service.title} appointment`,
        customerInfo: formData
      };

      // Call API to create booking
      fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      }).then(response => response.json())
        .then(booking => {
          onPaymentSuccess({ ...appointment, booking });
        });
        
    }, 2000);
  };

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold">{appointment.service.title}</h3>
          <p className="text-gray-600">{appointment.date} at {appointment.time}</p>
          <p className="text-xl font-bold text-green-600 mt-2">${appointment.service.price}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300"
        >
          {processing ? 'Processing Payment...' : `Pay $${appointment.service.price}`}
        </button>
      </div>
    </div>
  );
};

// Video Call Component (Chime SDK Placeholder)
const VideoCall = ({ appointment, onEndCall }) => {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="flex h-full">
        <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👨‍⚕️</span>
            </div>
            <h3 className="text-xl font-semibold">Dr. Provider</h3>
            <p className="text-gray-300">{appointment.service.title}</p>
            <p className="text-gray-400 mt-2">Call Duration: {formatTime(callDuration)}</p>
          </div>
        </div>
        
        <div className="w-80 h-60 absolute bottom-20 right-6 bg-gray-800 rounded-lg border-2 border-white flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span>You</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-6">
        <div className="flex justify-center space-x-4">
          <button className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700" onClick={onEndCall}>
            <Video className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Admin Page
const AdminPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-4">Service Management</h2>
          <p className="text-gray-600">Admin can create, edit, and delete telehealth services here.</p>
          <p className="text-sm text-gray-500 mt-4">API: {API_BASE_URL}</p>
        </div>
      </div>
    </div>
  );
};

// Bookings Page
const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/bookings`)
      .then(response => response.json())
      .then(data => setBookings(data.bookings || []))
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">My Appointments</h1>
        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No appointments yet</h3>
            <p className="text-gray-600 mb-4">Book your first telehealth consultation</p>
            <Link to="/" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              Book Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold">Telehealth Consultation</h3>
                <p className="text-gray-600">{booking.scheduledDate} at {booking.scheduledTime}</p>
                <p className="text-green-600 font-semibold">${booking.totalAmount}</p>
                <p className="text-sm text-gray-500">Status: {booking.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [currentStep, setCurrentStep] = useState('services'); // 'services', 'booking', 'payment', 'video'
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [completedBooking, setCompletedBooking] = useState(null);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setCurrentStep('booking');
  };

  const handleTimeSelect = (appointment) => {
    setSelectedAppointment(appointment);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = (bookingData) => {
    setCompletedBooking(bookingData);
    setCurrentStep('video');
  };

  const handleEndCall = () => {
    setCurrentStep('services');
    setSelectedService(null);
    setSelectedAppointment(null);
    setCompletedBooking(null);
  };

  // Render different steps
  if (currentStep === 'booking' && selectedService) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <button
          onClick={() => setCurrentStep('services')}
          className="max-w-2xl mx-auto mt-4 px-4 text-green-600 hover:text-green-700 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Services
        </button>
        <CalendarBooking service={selectedService} onTimeSelect={handleTimeSelect} />
      </div>
    );
  }

  if (currentStep === 'payment' && selectedAppointment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <button
          onClick={() => setCurrentStep('booking')}
          className="max-w-lg mx-auto mt-4 px-4 text-green-600 hover:text-green-700 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Calendar
        </button>
        <StripeCheckout appointment={selectedAppointment} onPaymentSuccess={handlePaymentSuccess} />
      </div>
    );
  }

  if (currentStep === 'video' && completedBooking) {
    return <VideoCall appointment={completedBooking} onEndCall={handleEndCall} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<ServiceSelection onServiceSelect={handleServiceSelect} />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
