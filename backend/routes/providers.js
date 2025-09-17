const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock data - in production, this would come from a database
let providers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    description: 'Professional house cleaner with 8+ years of experience. Eco-friendly products only.',
    category: 'home-services',
    rating: 4.9,
    reviewCount: 127,
    hourlyRate: 35,
    location: 'Downtown Seattle',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    skills: ['Deep Cleaning', 'Eco-Friendly', 'Pet-Friendly'],
    availability: 'available',
    verified: true,
    responseTime: '< 1 hour',
    completedJobs: 340
  },
  {
    id: '2',
    name: 'Mike Chen',
    description: 'Licensed electrician specializing in residential and commercial electrical work.',
    category: 'home-services',
    rating: 4.8,
    reviewCount: 89,
    hourlyRate: 75,
    location: 'Bellevue',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    skills: ['Electrical Repair', 'Installation', 'Emergency Service'],
    availability: 'busy',
    verified: true,
    responseTime: '< 2 hours',
    completedJobs: 156
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    description: 'Certified personal trainer and nutritionist helping you achieve your fitness goals.',
    category: 'wellness',
    rating: 4.9,
    reviewCount: 203,
    hourlyRate: 60,
    location: 'Capitol Hill',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    skills: ['Personal Training', 'Nutrition Coaching', 'Yoga'],
    availability: 'available',
    verified: true,
    responseTime: '< 30 mins',
    completedJobs: 289
  }
];

// GET /api/providers - Get all providers with optional filtering
router.get('/', (req, res) => {
  try {
    let filteredProviders = [...providers];
    const { category, location, availability, minRating, sortBy, sortOrder } = req.query;

    // Apply filters
    if (category) {
      filteredProviders = filteredProviders.filter(p => p.category === category);
    }
    if (location) {
      filteredProviders = filteredProviders.filter(p => 
        p.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    if (availability) {
      filteredProviders = filteredProviders.filter(p => p.availability === availability);
    }
    if (minRating) {
      filteredProviders = filteredProviders.filter(p => p.rating >= parseFloat(minRating));
    }

    // Apply sorting
    if (sortBy) {
      filteredProviders.sort((a, b) => {
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
      providers: filteredProviders,
      total: filteredProviders.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// GET /api/providers/:id - Get a specific provider
router.get('/:id', (req, res) => {
  try {
    const provider = providers.find(p => p.id === req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

// POST /api/providers - Create a new provider
router.post('/', (req, res) => {
  try {
    const newProvider = {
      id: uuidv4(),
      ...req.body,
      rating: 0,
      reviewCount: 0,
      completedJobs: 0,
      verified: false
    };
    
    providers.push(newProvider);
    res.status(201).json(newProvider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

// PUT /api/providers/:id - Update a provider
router.put('/:id', (req, res) => {
  try {
    const index = providers.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    providers[index] = { ...providers[index], ...req.body };
    res.json(providers[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

// DELETE /api/providers/:id - Delete a provider
router.delete('/:id', (req, res) => {
  try {
    const index = providers.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    providers.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

module.exports = router;
