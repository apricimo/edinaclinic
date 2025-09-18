const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock data - Updated for healthcare professionals
let providers = [
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
