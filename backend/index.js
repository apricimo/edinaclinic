const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure AWS DynamoDB
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = new AWS.DynamoDB.DocumentClient();

// Table names
const TABLES = {
  PROVIDERS: 'TeleHealth-Providers',
  SERVICES: 'TeleHealth-Services',
  BOOKINGS: 'TeleHealth-Bookings'
};

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// GET /api/providers
app.get('/api/providers', async (req, res) => {
  try {
    const result = await docClient.scan({
      TableName: TABLES.PROVIDERS
    }).promise();
    
    res.json({
      providers: result.Items,
      total: result.Items.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// POST /api/providers
app.post('/api/providers', async (req, res) => {
  try {
    const provider = {
      id: uuidv4(),
      ...req.body,
      rating: 0,
      reviewCount: 0,
      completedJobs: 0,
      verified: false,
      createdAt: new Date().toISOString()
    };
    
    await docClient.put({
      TableName: TABLES.PROVIDERS,
      Item: provider
    }).promise();
    
    res.status(201).json(provider);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

// PUT /api/providers/:id
app.put('/api/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    Object.keys(updates).forEach((key, index) => {
      const attr = `#attr${index}`;
      const val = `:val${index}`;
      updateExpressions.push(`${attr} = ${val}`);
      expressionAttributeNames[attr] = key;
      expressionAttributeValues[val] = updates[key];
    });
    
    const result = await docClient.update({
      TableName: TABLES.PROVIDERS,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    res.json(result.Attributes);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

// DELETE /api/providers/:id
app.delete('/api/providers/:id', async (req, res) => {
  try {
    await docClient.delete({
      TableName: TABLES.PROVIDERS,
      Key: { id: req.params.id }
    }).promise();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

// GET /api/services
app.get('/api/services', async (req, res) => {
  try {
    const result = await docClient.scan({
      TableName: TABLES.SERVICES
    }).promise();
    
    res.json({
      services: result.Items,
      total: result.Items.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /api/services
app.post('/api/services', async (req, res) => {
  try {
    const service = {
      id: uuidv4(),
      ...req.body,
      rating: 0,
      reviewCount: 0,
      featured: false,
      createdAt: new Date().toISOString()
    };
    
    await docClient.put({
      TableName: TABLES.SERVICES,
      Item: service
    }).promise();
    
    res.status(201).json(service);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PUT /api/services/:id
app.put('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    Object.keys(updates).forEach((key, index) => {
      const attr = `#attr${index}`;
      const val = `:val${index}`;
      updateExpressions.push(`${attr} = ${val}`);
      expressionAttributeNames[attr] = key;
      expressionAttributeValues[val] = updates[key];
    });
    
    const result = await docClient.update({
      TableName: TABLES.SERVICES,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }).promise();
    
    res.json(result.Attributes);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE /api/services/:id
app.delete('/api/services/:id', async (req, res) => {
  try {
    await docClient.delete({
      TableName: TABLES.SERVICES,
      Key: { id: req.params.id }
    }).promise();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// GET /api/bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const result = await docClient.scan({
      TableName: TABLES.BOOKINGS
    }).promise();
    
    res.json({
      bookings: result.Items,
      total: result.Items.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// POST /api/bookings
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = {
      id: uuidv4(),
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    await docClient.put({
      TableName: TABLES.BOOKINGS,
      Item: booking
    }).promise();
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [bookingsResult, providersResult] = await Promise.all([
      docClient.scan({ TableName: TABLES.BOOKINGS }).promise(),
      docClient.scan({ TableName: TABLES.PROVIDERS }).promise()
    ]);
    
    const bookings = bookingsResult.Items;
    const providers = providersResult.Items;
    
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const activeProviders = providers.filter(p => p.availability === 'available').length;
    const completedToday = bookings.filter(b => b.status === 'completed').length;
    
    const recentBookings = bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(booking => ({
        ...booking,
        patientName: booking.patientName || 'Patient',
        service: booking.service || 'Consultation',
        provider: booking.provider || 'Provider'
      }));
    
    res.json({
      totalBookings,
      totalRevenue,
      activeProviders,
      completedToday,
      recentBookings
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
