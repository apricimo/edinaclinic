const express = require('express');
const router = express.Router();

// Mock data
const categories = [
  {
    id: 'home-services',
    name: 'Home Services',
    icon: '🏠',
    subcategories: ['cleaning', 'plumbing', 'electrical', 'gardening', 'handyman', 'painting']
  },
  {
    id: 'wellness',
    name: 'Health & Wellness',
    icon: '💪',
    subcategories: ['fitness', 'massage', 'nutrition', 'yoga', 'mental-health', 'beauty']
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: '💻',
    subcategories: ['web-development', 'mobile-apps', 'it-support', 'data-analysis', 'cybersecurity']
  },
  {
    id: 'business',
    name: 'Business Services',
    icon: '📊',
    subcategories: ['consulting', 'marketing', 'accounting', 'legal', 'design', 'writing']
  },
  {
    id: 'education',
    name: 'Education & Tutoring',
    icon: '📚',
    subcategories: ['math', 'science', 'languages', 'music', 'art', 'test-prep']
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: '🚗',
    subcategories: ['repair', 'maintenance', 'detailing', 'towing', 'inspection']
  },
  {
    id: 'events',
    name: 'Events & Entertainment',
    icon: '🎉',
    subcategories: ['photography', 'catering', 'music', 'decoration', 'planning']
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    icon: '🐕',
    subcategories: ['walking', 'grooming', 'sitting', 'training', 'veterinary']
  }
];

// GET /api/categories - Get all categories
router.get('/', (req, res) => {
  try {
    res.json({
      categories,
      total: categories.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:id - Get a specific category
router.get('/:id', (req, res) => {
  try {
    const category = categories.find(c => c.id === req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

module.exports = router;
