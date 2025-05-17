// orderController.js
// Handles business logic for orders

const { v4: uuidv4 } = require('uuid');
const logger = require('../common/logger');
const { executeOrderPlacementSaga, getOrderEvents } = require('../common/saga');
const { metrics } = require('../common/metrics');
const orders = {};

// Store processed requests for idempotency
const processedRequests = new Map();

exports.placeOrder = async (req, res) => {
    try {
        const startTime = Date.now();
        const { customer, items, shippingAddress } = req.body;
        const idempotencyKey = req.headers['idempotency-key'];
        
        // Check for idempotency
        if (idempotencyKey && processedRequests.has(idempotencyKey)) {
            logger.info(`Duplicate request detected with idempotency key: ${idempotencyKey}`);
            const cachedResponse = processedRequests.get(idempotencyKey);
            return res.status(cachedResponse.status).json(cachedResponse.body);
        }
        
        if (!customer || !items || !shippingAddress) {
            const response = { error: 'Missing required fields' };
            if (idempotencyKey) {
                processedRequests.set(idempotencyKey, { status: 400, body: response });
            }
            return res.status(400).json(response);
        }
        
        // Execute saga for order placement with resilience patterns
        const result = await executeOrderPlacementSaga({ customer, items, shippingAddress }, orders);
        
        // Calculate duration for metrics
        const duration = (Date.now() - startTime) / 1000;
        metrics.orderProcessingDuration.observe(duration);
        
        // Increment order counter with appropriate status
        metrics.orderCounter.inc({ status: result.status });
        
        // Log order placement
        logger.info(`Order placed with ID ${result.orderId}`, { 
            orderId: result.orderId, 
            status: result.status,
            customer: customer,
            itemCount: items.length,
            processingTime: duration
        });
        
        // Store response for idempotency
        if (idempotencyKey) {
            const responseStatus = result.success ? 201 : 400;
            processedRequests.set(idempotencyKey, { 
                status: responseStatus, 
                body: result 
            });
        }
        
        // Send response
        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        logger.error('Error in order placement', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getOrder = (req, res) => {
    const order = orders[req.params.id];
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
};

exports.healthCheck = (req, res) => {
    res.json({ status: 'OK' });
};

exports.updateOrder = (req, res) => {
    const order = orders[req.params.id];
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'PLACED') {
        return res.status(400).json({ error: 'Order cannot be updated after processing' });
    }
    const { shippingAddress } = req.body;
    if (shippingAddress) {
        order.shippingAddress = shippingAddress;
    }
    res.json({ message: 'Order updated', order });
};

exports.cancelOrder = (req, res) => {
    const order = orders[req.params.id];
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'PLACED') {
        return res.status(400).json({ error: 'Order cannot be cancelled after processing' });
    }
    order.status = 'CANCELLED';
    res.json({ message: 'Order cancelled', order });
};

// Simulate order processing (inventory check, payment, confirmation)
exports.processOrder = (req, res) => {
    const order = orders[req.params.id];
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'PLACED') {
        return res.status(400).json({ error: 'Order already processed or cancelled' });
    }
    // Simulate inventory check and payment
    order.status = 'CONFIRMED';
    order.processedAt = new Date().toISOString();
    res.json({ message: 'Order processed and confirmed', order });
};

// Simulate order fulfillment (shipping label, inventory update, notify shipping)
exports.fulfillOrder = (req, res) => {
    const order = orders[req.params.id];
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'CONFIRMED') {
        return res.status(400).json({ error: 'Order must be confirmed before fulfillment' });
    }
    order.status = 'SHIPPED';
    order.shippedAt = new Date().toISOString();
    order.trackingNumber = 'TRACK-' + order.id.slice(0, 8);
    res.json({ message: 'Order fulfilled and shipped', order });
};
