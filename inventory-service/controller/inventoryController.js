// inventoryController.js
// Handles business logic for inventory operations

const { v4: uuidv4 } = require('uuid');
const logger = require('../common/logger');
const { metrics } = require('../common/metrics');

// In-memory inventory database
// In a real application, this would be a database
const inventory = {
  // Example inventory items
  'PROD-001': { available: 100, reserved: 0 },
  'PROD-002': { available: 50, reserved: 0 },
  'PROD-003': { available: 75, reserved: 0 },
  'PROD-004': { available: 200, reserved: 0 },
  'PROD-005': { available: 10, reserved: 0 }
};

// Store processed requests for idempotency
const processedRequests = new Map();

exports.checkInventory = async (req, res) => {
  try {
    const startTime = Date.now();
    const items = req.query.items ? JSON.parse(req.query.items) : req.body.items;
    const idempotencyKey = req.headers['idempotency-key'];

    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`check-${idempotencyKey}`)) {
      logger.info(`Duplicate request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`check-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }

    if (!items || !Array.isArray(items)) {
      const response = { error: 'Invalid items format' };
      if (idempotencyKey) {
        processedRequests.set(`check-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }

    // Simulate a random delay (0-100ms) to mimic DB access
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Randomly fail 10% of requests if CHAOS_MODE is enabled
    if (process.env.CHAOS_MODE === 'true' && Math.random() < 0.1) {
      logger.warn('Chaos testing: Generating random inventory check failure');
      throw new Error('Chaos testing failure');
    }

    const result = {
      available: true,
      items: []
    };

    // Check each item
    for (const item of items) {
      const { productId, quantity } = item;
      
      if (!inventory[productId]) {
        result.available = false;
        result.items.push({
          productId,
          quantity,
          available: false,
          message: 'Product not found'
        });
        continue;
      }

      const available = inventory[productId].available >= quantity;
      result.items.push({
        productId,
        quantity,
        available
      });

      if (!available) {
        result.available = false;
      }
    }

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.inventoryOperationDuration.observe({ operation: 'check' }, duration);
    
    // Increment counter with appropriate status
    metrics.inventoryCheckCounter.inc({ status: result.available ? 'available' : 'unavailable' });

    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`check-${idempotencyKey}`, { 
        status: 200, 
        body: result 
      });
    }

    logger.info(`Inventory check completed`, { 
      available: result.available,
      itemCount: items.length,
      processingTime: duration
    });

    res.json(result);
  } catch (error) {
    logger.error('Error checking inventory', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.reserveInventory = async (req, res) => {
  try {
    const startTime = Date.now();
    const { items, orderId } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || orderId;

    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`reserve-${idempotencyKey}`)) {
      logger.info(`Duplicate reservation request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`reserve-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }

    if (!items || !Array.isArray(items) || !orderId) {
      const response = { error: 'Invalid request format. Requires items array and orderId.' };
      if (idempotencyKey) {
        processedRequests.set(`reserve-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }

    // Simulate a random delay (0-200ms) to mimic DB transaction
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    
    // Randomly fail 10% of requests if CHAOS_MODE is enabled
    if (process.env.CHAOS_MODE === 'true' && Math.random() < 0.1) {
      logger.warn('Chaos testing: Generating random inventory reservation failure');
      throw new Error('Chaos testing failure');
    }

    const result = {
      reserved: true,
      items: []
    };

    // Check and reserve each item
    for (const item of items) {
      const { productId, quantity } = item;
      
      if (!inventory[productId] || inventory[productId].available < quantity) {
        result.reserved = false;
        result.items.push({
          productId,
          quantity,
          reserved: false,
          message: !inventory[productId] ? 'Product not found' : 'Insufficient inventory'
        });
        continue;
      }

      // Update inventory (reserve the items)
      inventory[productId].available -= quantity;
      inventory[productId].reserved += quantity;
      
      result.items.push({
        productId,
        quantity,
        reserved: true
      });
    }

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.inventoryOperationDuration.observe({ operation: 'reserve' }, duration);
    
    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`reserve-${idempotencyKey}`, { 
        status: 200, 
        body: result 
      });
    }

    logger.info(`Inventory reservation completed`, { 
      orderId,
      reserved: result.reserved,
      itemCount: items.length,
      processingTime: duration
    });

    res.json(result);
  } catch (error) {
    logger.error('Error reserving inventory', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.releaseInventory = async (req, res) => {
  try {
    const startTime = Date.now();
    const { items, orderId } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || orderId;

    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`release-${idempotencyKey}`)) {
      logger.info(`Duplicate release request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`release-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }

    if (!items || !Array.isArray(items) || !orderId) {
      const response = { error: 'Invalid request format. Requires items array and orderId.' };
      if (idempotencyKey) {
        processedRequests.set(`release-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }

    // Simulate a random delay (0-150ms) to mimic DB transaction
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
    
    const result = {
      released: true,
      items: []
    };

    // Process each item
    for (const item of items) {
      const { productId, quantity } = item;
      
      if (!inventory[productId]) {
        result.released = false;
        result.items.push({
          productId,
          quantity,
          released: false,
          message: 'Product not found'
        });
        continue;
      }

      // Update inventory (release the reserved items)
      // Ensure we don't release more than what was reserved
      const releaseQty = Math.min(quantity, inventory[productId].reserved);
      inventory[productId].available += releaseQty;
      inventory[productId].reserved -= releaseQty;
      
      result.items.push({
        productId,
        quantity,
        released: true
      });
    }

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.inventoryOperationDuration.observe({ operation: 'release' }, duration);
    metrics.inventoryReleaseCounter.inc({ status: 'released' });
    
    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`release-${idempotencyKey}`, { 
        status: 200, 
        body: result 
      });
    }

    logger.info(`Inventory release completed`, { 
      orderId,
      itemCount: items.length,
      processingTime: duration
    });

    res.json(result);
  } catch (error) {
    logger.error('Error releasing inventory', { error: error.message, stack: error.stack });
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

// Get inventory status
exports.getInventoryStatus = (req, res) => {
  try {
    const result = Object.entries(inventory).map(([productId, data]) => ({
      productId,
      available: data.available,
      reserved: data.reserved,
      total: data.available + data.reserved
    }));

    res.json(result);
  } catch (error) {
    logger.error('Error getting inventory status', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};
