const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock data
let services = [
  {
    id: '1',
    providerId: '1',
    title: 'Deep House Cleaning',
    description: 'Complete deep cleaning service including bathrooms, kitchen, bedrooms, and living areas. All eco-friendly products included.',
    category: 'home-services',
    subcategory: 'cleaning',
    price: 120,
    priceType: 'fixed',
    duration: '3-4 hours',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400'
    ],
    tags: ['deep-cleaning', 'eco-friendly', 'pet-safe'],
    rating: 4.9,
    reviewCount: 127,
    featured: true
  },
  {
    id: '2',
    providerId: '2',
    title: 'Electrical Installation & Repair',
    description: 'Professional electrical services including outlet installation, lighting fixtures, and electrical troubleshooting.',
    category: 'home-services',
    subcategory: 'electrical',
    price: 75,
    priceType: 'hourly',
    duration: 'varies',
    images: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400'
    ],
    tags: ['licensed', 'emergency-available', 'warranty'],
    rating: 4.8,
    reviewCount: 89,
    featured: false
  },
  {
    id: '3',
    providerId: '3',
    title: 'Personal Training Session',
    description: 'One-on-one personal training session customized to your fitness goals and experience level.',
    category: 'wellness',
    subcategory: 'fitness',
    price: 60,
    priceType: 'hourly',
    duration: '1 hour',
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
    ],
    tags: ['certified-trainer', 'nutrition-included', 'flexible-schedule'],
    rating: 4.9,
    reviewCount: 203,
    featured: true
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
