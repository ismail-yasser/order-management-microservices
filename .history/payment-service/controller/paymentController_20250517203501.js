// paymentController.js
// Handles business logic for payment operations

const { v4: uuidv4 } = require('uuid');
const logger = require('../common/logger');
const { metrics } = require('../common/metrics');

// In-memory payment database
// In a real application, this would be a database
const payments = {};

// Store processed requests for idempotency
const processedRequests = new Map();

exports.authorizePayment = async (req, res) => {
  try {
    const startTime = Date.now();
    const { orderId, amount, paymentMethod } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || orderId;

    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`authorize-${idempotencyKey}`)) {
      logger.info(`Duplicate payment authorization request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`authorize-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }

    if (!orderId || !amount || !paymentMethod) {
      const response = { error: 'Missing required fields' };
      if (idempotencyKey) {
        processedRequests.set(`authorize-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }

    // Simulate a random delay (100-500ms) to mimic payment gateway
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    // Randomly fail 15% of requests if CHAOS_MODE is enabled
    if (process.env.CHAOS_MODE === 'true' && Math.random() < 0.15) {
      logger.warn('Chaos testing: Generating random payment failure');
      
      const errorResponse = { 
        success: false, 
        orderId, 
        error: 'Payment declined', 
        code: 'PAYMENT_DECLINED'
      };
      
      if (idempotencyKey) {
        processedRequests.set(`authorize-${idempotencyKey}`, { 
          status: 400, 
          body: errorResponse 
        });
      }
      
      metrics.paymentCounter.inc({ status: 'declined' });
      
      return res.status(400).json(errorResponse);
    }

    // Create payment record
    const paymentId = uuidv4();
    const payment = {
      id: paymentId,
      orderId,
      amount,
      paymentMethod,
      status: 'AUTHORIZED',
      authorizationCode: `AUTH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      timestamp: new Date().toISOString()
    };
    
    payments[paymentId] = payment;

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.paymentProcessingDuration.observe(duration);
    metrics.paymentCounter.inc({ status: 'authorized' });
    
    // Prepare response
    const result = {
      success: true,
      orderId,
      paymentId,
      status: payment.status,
      authorizationCode: payment.authorizationCode
    };
    
    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`authorize-${idempotencyKey}`, { 
        status: 200, 
        body: result 
      });
    }

    logger.info(`Payment authorized`, { 
      orderId,
      paymentId,
      amount,
      paymentMethod,
      processingTime: duration
    });

    res.json(result);
  } catch (error) {
    logger.error('Error processing payment', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const startTime = Date.now();
    const { orderId, paymentId } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || `refund-${orderId}`;

    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`refund-${idempotencyKey}`)) {
      logger.info(`Duplicate refund request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`refund-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }

    if (!orderId || !paymentId) {
      const response = { error: 'Missing required fields' };
      if (idempotencyKey) {
        processedRequests.set(`refund-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }

    // Retrieve the payment
    const payment = payments[paymentId];
    
    if (!payment || payment.orderId !== orderId) {
      const response = { success: false, error: 'Payment not found' };
      if (idempotencyKey) {
        processedRequests.set(`refund-${idempotencyKey}`, { status: 404, body: response });
      }
      return res.status(404).json(response);
    }

    // Simulate a random delay (50-300ms) to mimic payment gateway
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 250));
    
    // Update payment status
    payment.status = 'REFUNDED';
    payment.refundedAt = new Date().toISOString();
    payment.refundReference = `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.paymentProcessingDuration.observe(duration);
    metrics.paymentCounter.inc({ status: 'refunded' });
    
    // Prepare response
    const result = {
      success: true,
      orderId,
      paymentId,
      status: payment.status,
      refundReference: payment.refundReference
    };
    
    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`refund-${idempotencyKey}`, { 
        status: 200, 
        body: result 
      });
    }

    logger.info(`Payment refunded`, { 
      orderId,
      paymentId,
      processingTime: duration
    });

    res.json(result);
  } catch (error) {
    logger.error('Error refunding payment', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPayment = (req, res) => {
  try {
    const payment = payments[req.params.id];
    if (!payment) {
      logger.info(`Payment not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Don't return all payment details in a real app
    const sanitizedPayment = {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      timestamp: payment.timestamp
    };
    
    logger.info(`Payment retrieved: ${req.params.id}`);
    res.json(sanitizedPayment);
  } catch (error) {
    logger.error('Error retrieving payment', { error: error.message, paymentId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.healthCheck = (req, res) => {
  // Add more detailed health info in a real app
  res.json({ 
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
