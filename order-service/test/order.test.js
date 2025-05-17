const request = require('supertest');
const express = require('express');
const orderRoutes = require('../routes/orderRoutes');
const orderController = require('../controller/orderController');

// Mock dependencies
jest.mock('../common/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../common/metrics', () => ({
  metrics: {
    orderCounter: {
      inc: jest.fn(),
    },
    orderProcessingDuration: {
      observe: jest.fn(),
    },
    register: {
      contentType: 'text/plain',
      metrics: jest.fn().mockResolvedValue('metrics data'),
    },
  },
}));

jest.mock('../common/saga', () => ({
  executeOrderPlacementSaga: jest.fn().mockImplementation((orderData, orders) => {
    const orderId = 'test-order-id';
    orders[orderId] = {
      id: orderId,
      customer: orderData.customer,
      items: orderData.items,
      shippingAddress: orderData.shippingAddress,
      status: 'PLACED',
      createdAt: new Date().toISOString(),
    };
    return Promise.resolve({ success: true, orderId, status: 'PLACED' });
  }),
  getOrderEvents: jest.fn().mockReturnValue([]),
}));

// Setup test app
const app = express();
app.use(express.json());
app.use('/', orderRoutes);

describe('Order Service API', () => {
  describe('POST /orders', () => {
    it('should create a new order with valid input', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          customer: 'Test User',
          items: [{ productId: 'prod1', quantity: 2 }],
          shippingAddress: '123 Test St',
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 with invalid input', async () => {
      const response = await request(app)
        .post('/orders')
        .send({
          customer: 'Test User',
          // Missing items and shippingAddress
        });
      
      expect(response.statusCode).toBe(400);
    });

    it('should handle idempotency correctly', async () => {
      const idempotencyKey = 'test-key-123';
      
      // First request
      await request(app)
        .post('/orders')
        .set('idempotency-key', idempotencyKey)
        .send({
          customer: 'Test User',
          items: [{ productId: 'prod1', quantity: 2 }],
          shippingAddress: '123 Test St',
        });
        
      // Second request with same key should return cached response
      const secondResponse = await request(app)
        .post('/orders')
        .set('idempotency-key', idempotencyKey)
        .send({
          customer: 'Different User', // This should be ignored due to idempotency
          items: [{ productId: 'different', quantity: 5 }],
          shippingAddress: 'Different address',
        });
      
      expect(secondResponse.statusCode).toBe(201);
      expect(secondResponse.body.success).toBe(true);
    });
  });

  // More tests for other endpoints...
});

describe('Chaos Testing', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  it('should inject failures when CHAOS_MODE is enabled', async () => {
    process.env.CHAOS_MODE = 'true';
    // Mock Math.random to always return 0.01 (less than the 0.05 threshold)
    const originalMathRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.01);
    
    const response = await request(app).get('/orders/test-id');
    
    // Should fail with 500 due to chaos injection
    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Chaos testing failure');
    
    // Restore Math.random
    Math.random = originalMathRandom;
  });
});
