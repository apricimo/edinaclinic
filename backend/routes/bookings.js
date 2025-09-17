const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock data
let bookings = [
  {
    id: '1',
    serviceId: '1',
    providerId: '1',
    clientId: 'client1',
    status: 'confirmed',
    scheduledDate: '2025-09-20',
    scheduledTime: '10:00',
    totalAmount: 120,
    notes: 'Please focus on the kitchen and bathrooms',
    createdAt: '2025-09-17T10:00:00Z'
  },
  {
    id: '2',
    serviceId: '3',
    providerId: '3',
    clientId: 'client2',
    status: 'pending',
    scheduledDate: '2025-09-18',
    scheduledTime: '16:00',
    totalAmount: 60,
    notes: 'First time client, beginner level',
    createdAt: '2025-09-17T08:30:00Z'
  }
];

// GET /api/bookings - Get all bookings with optional filtering
router.get('/', (req, res) => {
  try {
    let filteredBookings = [...bookings];
    const { status, providerId, clientId, serviceId } = req.query;

    if (status) {
      filteredBookings = filteredBookings.filter(b => b.status === status);
    }
    if (providerId) {
      filteredBookings = filteredBookings.filter(b => b.providerId === providerId);
    }
    if (clientId) {
      filteredBookings = filteredBookings.filter(b => b.clientId === clientId);
    }
    if (serviceId) {
      filteredBookings = filteredBookings.filter(b => b.serviceId === serviceId);
    }

    res.json({
      bookings: filteredBookings,
      total: filteredBookings.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id - Get a specific booking
router.get('/:id', (req, res) => {
  try {
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// POST /api/bookings - Create a new booking
router.post('/', (req, res) => {
  try {
    const newBooking = {
      id: uuidv4(),
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    bookings.push(newBooking);
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PUT /api/bookings/:id - Update a booking
router.put('/:id', (req, res) => {
  try {
    const index = bookings.findIndex(b => b.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    bookings[index] = { ...bookings[index], ...req.body };
    res.json(bookings[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// DELETE /api/bookings/:id - Cancel/delete a booking
router.delete('/:id', (req, res) => {
  try {
    const index = bookings.findIndex(b => b.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Instead of deleting, mark as cancelled
    bookings[index].status = 'cancelled';
    res.json(bookings[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
