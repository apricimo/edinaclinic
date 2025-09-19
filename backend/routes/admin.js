const express = require('express');
const router = express.Router();

// GET /api/admin/dashboard - Get admin dashboard data
router.get('/dashboard', (req, res) => {
  try {
    // This would normally query your database
    const dashboardData = {
      totalBookings: 145,
      totalRevenue: 28450,
      activeProviders: 12,
      completedToday: 8,
      recentBookings: [
        {
          id: '1',
          patientName: 'John Smith',
          service: 'Primary Care Consultation',
          provider: 'Dr. Joseph Kumka',
          amount: 99,
          status: 'completed',
          date: '2025-09-18'
        },
        {
          id: '2',
          patientName: 'Sarah Johnson',
          service: 'Mental Health Consultation',
          provider: 'Dr. Sarah Wilson',
          amount: 150,
          status: 'pending',
          date: '2025-09-18'
        },
        {
          id: '3',
          patientName: 'Mike Davis',
          service: 'Dermatology Consultation',
          provider: 'Dr. Michael Chen',
          amount: 200,
          status: 'completed',
          date: '2025-09-17'
        }
      ]
    };
    
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
