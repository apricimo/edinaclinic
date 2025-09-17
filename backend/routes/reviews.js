const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock data
let reviews = [
  {
    id: '1',
    serviceId: '1',
    providerId: '1',
    clientId: 'client1',
    clientName: 'John Doe',
    rating: 5,
    comment: 'Sarah did an amazing job! My house has never been cleaner. Very professional and used eco-friendly products as promised.',
    date: '2025-09-15',
    verified: true
  },
  {
    id: '2',
    serviceId: '1',
    providerId: '1',
    clientId: 'client2',
    clientName: 'Jane Smith',
    rating: 5,
    comment: 'Excellent service! Sarah was punctual, thorough, and very friendly. Will definitely book again.',
    date: '2025-09-10',
    verified: true
  },
  {
    id: '3',
    serviceId: '2',
    providerId: '2',
    clientId: 'client3',
    clientName: 'Mike Johnson',
    rating: 5,
    comment: 'Mike fixed our electrical issue quickly and professionally. Great communication throughout the process.',
    date: '2025-09-12',
    verified: true
  },
  {
    id: '4',
    serviceId: '3',
    providerId: '3',
    clientId: 'client4',
    clientName: 'Lisa Brown',
    rating: 5,
    comment: 'Emily is an fantastic trainer! She created a personalized workout plan and the nutrition advice was very helpful.',
    date: '2025-09-14',
    verified: true
  }
];

// GET /api/reviews - Get all reviews with optional filtering
router.get('/', (req, res) => {
  try {
    let filteredReviews = [...reviews];
    const { serviceId, providerId, clientId, minRating } = req.query;

    if (serviceId) {
      filteredReviews = filteredReviews.filter(r => r.serviceId === serviceId);
    }
    if (providerId) {
      filteredReviews = filteredReviews.filter(r => r.providerId === providerId);
    }
    if (clientId) {
      filteredReviews = filteredReviews.filter(r => r.clientId === clientId);
    }
    if (minRating) {
      filteredReviews = filteredReviews.filter(r => r.rating >= parseInt(minRating));
    }

    // Sort by date (newest first)
    filteredReviews.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      reviews: filteredReviews,
      total: filteredReviews.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/:id - Get a specific review
router.get('/:id', (req, res) => {
  try {
    const review = reviews.find(r => r.id === req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// GET /api/reviews/service/:serviceId/stats - Get review statistics for a service
router.get('/service/:serviceId/stats', (req, res) => {
  try {
    const serviceReviews = reviews.filter(r => r.serviceId === req.params.serviceId);
    
    if (serviceReviews.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const totalRating = serviceReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / serviceReviews.length;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    serviceReviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    res.json({
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: serviceReviews.length,
      ratingDistribution
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review stats' });
  }
});

// POST /api/reviews - Create a new review
router.post('/', (req, res) => {
  try {
    const newReview = {
      id: uuidv4(),
      ...req.body,
      date: new Date().toISOString().split('T')[0],
      verified: false // Would be verified after confirming the booking was completed
    };
    
    reviews.push(newReview);
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// PUT /api/reviews/:id - Update a review
router.put('/:id', (req, res) => {
  try {
    const index = reviews.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    reviews[index] = { ...reviews[index], ...req.body };
    res.json(reviews[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE /api/reviews/:id - Delete a review
router.delete('/:id', (req, res) => {
  try {
    const index = reviews.findIndex(r => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    reviews.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
