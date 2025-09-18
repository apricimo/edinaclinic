const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock data - Updated for telehealth services
let services = [
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

// GET /api/services - Get all services with filtering
router.get('/', (req, res) => {
  try {
    let filteredServices = [...services];
    const { 
      category, 
      subcategory, 
      priceMin, 
      priceMax, 
      rating, 
      featured,
      search,
      sortBy,
      sortOrder 
    } = req.query;

    // Apply filters
    if (category) {
      filteredServices = filteredServices.filter(s => s.category === category);
    }
    if (subcategory) {
      filteredServices = filteredServices.filter(s => s.subcategory === subcategory);
    }
    if (priceMin) {
      filteredServices = filteredServices.filter(s => s.price >= parseFloat(priceMin));
    }
    if (priceMax) {
      filteredServices = filteredServices.filter(s => s.price <= parseFloat(priceMax));
    }
    if (rating) {
      filteredServices = filteredServices.filter(s => s.rating >= parseFloat(rating));
    }
    if (featured === 'true') {
      filteredServices = filteredServices.filter(s => s.featured);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredServices = filteredServices.filter(s => 
        s.title.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower) ||
        s.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    if (sortBy) {
      filteredServices.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }

    res.json({
      services: filteredServices,
      total: filteredServices.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET /api/services/:id - Get a specific service
router.get('/:id', (req, res) => {
  try {
    const service = services.find(s => s.id === req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// GET /api/services/provider/:providerId - Get services by provider
router.get('/provider/:providerId', (req, res) => {
  try {
    const providerServices = services.filter(s => s.providerId === req.params.providerId);
    res.json({
      services: providerServices,
      total: providerServices.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch provider services' });
  }
});

// POST /api/services - Create a new service
router.post('/', (req, res) => {
  try {
    const newService = {
      id: uuidv4(),
      ...req.body,
      rating: 0,
      reviewCount: 0,
      featured: false
    };
    
    services.push(newService);
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PUT /api/services/:id - Update a service
router.put('/:id', (req, res) => {
  try {
    const index = services.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    services[index] = { ...services[index], ...req.body };
    res.json(services[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE /api/services/:id - Delete a service
router.delete('/:id', (req, res) => {
  try {
    const index = services.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    services.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
