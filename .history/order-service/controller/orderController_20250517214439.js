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
    try {
        const order = orders[req.params.id];
        if (!order) {
            logger.info(`Order not found: ${req.params.id}`);
            return res.status(404).json({ error: 'Order not found' });
        }
        logger.info(`Order retrieved: ${req.params.id}`);
        res.json(order);
    } catch (error) {
        logger.error('Error retrieving order', { error: error.message, orderId: req.params.id });
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

exports.updateOrder = (req, res) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];
        
        // Check for idempotency
        if (idempotencyKey && processedRequests.has(`update-${idempotencyKey}`)) {
            logger.info(`Duplicate update request detected with idempotency key: ${idempotencyKey}`);
            const cachedResponse = processedRequests.get(`update-${idempotencyKey}`);
            return res.status(cachedResponse.status).json(cachedResponse.body);
        }
        
        const order = orders[req.params.id];
        if (!order) {
            const response = { error: 'Order not found' };
            if (idempotencyKey) {
                processedRequests.set(`update-${idempotencyKey}`, { status: 404, body: response });
            }
            return res.status(404).json(response);
        }
        
        if (order.status !== 'PLACED') {
            const response = { error: 'Order cannot be updated after processing' };
            if (idempotencyKey) {
                processedRequests.set(`update-${idempotencyKey}`, { status: 400, body: response });
            }
            return res.status(400).json(response);
        }
        
        const { shippingAddress } = req.body;
        if (shippingAddress) {
            order.shippingAddress = shippingAddress;
        }
        
        const response = { message: 'Order updated', order };
        if (idempotencyKey) {
            processedRequests.set(`update-${idempotencyKey}`, { status: 200, body: response });
        }
        
        logger.info(`Order updated: ${req.params.id}`, { orderId: req.params.id, shippingAddress });
        res.json(response);
    } catch (error) {
        logger.error('Error updating order', { error: error.message, orderId: req.params.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];
        
        // Check for idempotency
        if (idempotencyKey && processedRequests.has(`cancel-${idempotencyKey}`)) {
            logger.info(`Duplicate cancel request detected with idempotency key: ${idempotencyKey}`);
            const cachedResponse = processedRequests.get(`cancel-${idempotencyKey}`);
            return res.status(cachedResponse.status).json(cachedResponse.body);
        }
        
        const order = orders[req.params.id];
        if (!order) {
            const response = { error: 'Order not found' };
            if (idempotencyKey) {
                processedRequests.set(`cancel-${idempotencyKey}`, { status: 404, body: response });
            }
            return res.status(404).json(response);
        }
        
        // Use the isCancellable method from the Order model
        if (!order.isCancellable) {
            // If it's a plain object, apply the method from Order class
            const Order = require('../model/order');
            const orderInstance = new Order(order);
            if (!orderInstance.isCancellable()) {
                const response = { error: 'Order cannot be cancelled at this stage' };
                if (idempotencyKey) {
                    processedRequests.set(`cancel-${idempotencyKey}`, { status: 400, body: response });
                }
                return res.status(400).json(response);
            }
        } else if (!order.isCancellable()) {
            const response = { error: 'Order cannot be cancelled at this stage' };
            if (idempotencyKey) {
                processedRequests.set(`cancel-${idempotencyKey}`, { status: 400, body: response });
            }
            return res.status(400).json(response);
        }
        
        // If there's already a shipment, cancel it
        if (order.shipping && order.shipping.trackingNumber) {
            try {
                const axios = require('axios');
                const shippingServiceUrl = process.env.SHIPPING_SERVICE_URL || 'http://localhost:3003';
                
                // Find shipment by tracking number
                logger.info(`Cancelling shipment for order ${order.id}`, { 
                    orderId: order.id,
                    trackingNumber: order.shipping.trackingNumber
                });
                
                await axios.delete(`${shippingServiceUrl}/shipping/${order.id}`);
                logger.info(`Shipment cancelled for order ${order.id}`);
            } catch (shippingError) {
                logger.error(`Error cancelling shipment for order ${order.id}`, { 
                    error: shippingError.message,
                    orderId: order.id
                });
                // Continue with order cancellation even if shipment cancellation fails
            }
        }
        
        order.status = 'CANCELLED';
        order.cancelledAt = new Date().toISOString();
        metrics.orderCounter.inc({ status: 'CANCELLED' });
        
        const response = { message: 'Order cancelled', order };
        if (idempotencyKey) {
            processedRequests.set(`cancel-${idempotencyKey}`, { status: 200, body: response });
        }
        
        logger.info(`Order cancelled: ${req.params.id}`, { orderId: req.params.id });
        res.json(response);
    } catch (error) {
        logger.error('Error cancelling order', { error: error.message, orderId: req.params.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Simulate order processing (inventory check, payment, confirmation)
exports.processOrder = (req, res) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];
        const startTime = Date.now();
        
        // Check for idempotency
        if (idempotencyKey && processedRequests.has(`process-${idempotencyKey}`)) {
            logger.info(`Duplicate process request detected with idempotency key: ${idempotencyKey}`);
            const cachedResponse = processedRequests.get(`process-${idempotencyKey}`);
            return res.status(cachedResponse.status).json(cachedResponse.body);
        }
        
        const order = orders[req.params.id];
        if (!order) {
            const response = { error: 'Order not found' };
            if (idempotencyKey) {
                processedRequests.set(`process-${idempotencyKey}`, { status: 404, body: response });
            }
            return res.status(404).json(response);
        }
        
        if (order.status !== 'PLACED') {
            const response = { error: 'Order already processed or cancelled' };
            if (idempotencyKey) {
                processedRequests.set(`process-${idempotencyKey}`, { status: 400, body: response });
            }
            return res.status(400).json(response);
        }
        
        // Simulate inventory check and payment
        order.status = 'CONFIRMED';
        order.processedAt = new Date().toISOString();
        
        // Calculate duration for metrics
        const duration = (Date.now() - startTime) / 1000;
        metrics.orderProcessingDuration.observe(duration);
        metrics.orderCounter.inc({ status: 'CONFIRMED' });
        
        const response = { message: 'Order processed and confirmed', order };
        if (idempotencyKey) {
            processedRequests.set(`process-${idempotencyKey}`, { status: 200, body: response });
        }
        
        logger.info(`Order processed: ${req.params.id}`, { 
            orderId: req.params.id,
            status: order.status,
            processingTime: duration
        });
        
        res.json(response);
    } catch (error) {
        logger.error('Error processing order', { error: error.message, orderId: req.params.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Simulate order fulfillment (shipping label, inventory update, notify shipping)
exports.fulfillOrder = async (req, res) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];
        const startTime = Date.now();
        
        // Check for idempotency
        if (idempotencyKey && processedRequests.has(`fulfill-${idempotencyKey}`)) {
            logger.info(`Duplicate fulfill request detected with idempotency key: ${idempotencyKey}`);
            const cachedResponse = processedRequests.get(`fulfill-${idempotencyKey}`);
            return res.status(cachedResponse.status).json(cachedResponse.body);
        }
        
        const order = orders[req.params.id];
        if (!order) {
            const response = { error: 'Order not found' };
            if (idempotencyKey) {
                processedRequests.set(`fulfill-${idempotencyKey}`, { status: 404, body: response });
            }
            return res.status(404).json(response);
        }
        
        if (order.status !== 'CONFIRMED' && order.status !== 'READY_FOR_SHIPPING') {
            const response = { error: 'Order must be confirmed or ready for shipping before fulfillment' };
            if (idempotencyKey) {
                processedRequests.set(`fulfill-${idempotencyKey}`, { status: 400, body: response });
            }
            return res.status(400).json(response);
        }
        
        // Integration with shipping service
        try {
            const { shippingServiceBreaker } = require('../common/resilience');
            
            // Prepare shipment request data
            const shipmentData = {
                orderId: order.id,
                items: order.items,
                shippingAddress: order.shippingAddress,
                carrier: req.body.carrier || order.shipping?.carrier || 'STANDARD'
            };
            
            logger.info(`Creating shipment for order ${order.id}`, shipmentData);
            
            // Call shipping service through circuit breaker
            const shipmentResult = await shippingServiceBreaker.fire(shipmentData);
            const shipment = shipmentResult.data;
            
            // Update order with shipping information
            order.status = 'SHIPPED';
            order.shippedAt = new Date().toISOString();
            order.shipping = {
                trackingNumber: shipment.trackingNumber,
                carrier: shipment.carrier || shipmentData.carrier,
                shippedAt: shipment.createdAt || new Date().toISOString(),
                estimatedDeliveryDate: shipment.estimatedDeliveryDate || null,
                status: shipment.status || 'SHIPPED'
            };
            
            metrics.orderCounter.inc({ status: 'SHIPPED' });
            
            const duration = (Date.now() - startTime) / 1000;
            metrics.orderProcessingDuration.observe(duration);
            
            // Store response for idempotency
            const response = { message: 'Order fulfilled and shipped', order, shipment };
            if (idempotencyKey) {
                processedRequests.set(`fulfill-${idempotencyKey}`, { status: 200, body: response });
            }
            
            logger.info(`Order fulfilled: ${req.params.id}`, { 
                orderId: req.params.id,
                status: order.status,
                trackingNumber: order.shipping.trackingNumber,
                processingTime: duration
            });
            
            res.json(response);
            
        } catch (shippingError) {
            logger.error(`Error creating shipment for order ${order.id}`, { 
                error: shippingError.message, 
                orderId: order.id 
            });
            
            if (shippingError.response?.data?.usingFallback) {
                // If using fallback, update order with temporary tracking number
                order.status = 'READY_FOR_SHIPPING';
                order.shipping = {
                    trackingNumber: shippingError.response.data.trackingNumber,
                    carrier: req.body.carrier || order.shipping?.carrier || 'STANDARD',
                    status: 'PENDING_RETRY'
                };
                
                const response = { 
                    message: 'Order marked ready for shipping. Shipment will be created when the service is available.', 
                    order, 
                    shipmentPending: true 
                };
                
                if (idempotencyKey) {
                    processedRequests.set(`fulfill-${idempotencyKey}`, { status: 202, body: response });
                }
                
                return res.status(202).json(response);
            }
            
            throw shippingError;
        }
    } catch (error) {
        logger.error('Error fulfilling order', { error: error.message, orderId: req.params.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

// New endpoint for getting order events (for debugging and auditing)
exports.getOrderEvents = (req, res) => {
    try {
        const events = getOrderEvents(req.params.id);
        res.json({ events });
    } catch (error) {
        logger.error('Error getting order events', { error: error.message, orderId: req.params.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};
