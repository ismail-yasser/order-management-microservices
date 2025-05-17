// orderRoutes.js
// Defines API routes for orders

const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const { metrics } = require('../common/metrics');
const logger = require('../common/logger');

// Middleware for request logging
router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info('API Request', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: Date.now() - start,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });
    });
    next();
});

// Chaos testing middleware (enabled only when CHAOS_MODE=true)
router.use((req, res, next) => {
    if (process.env.CHAOS_MODE === 'true' && Math.random() < 0.05) {
        logger.warn('Chaos testing: Generating random 500 error');
        return res.status(500).json({ error: 'Chaos testing failure' });
    }
    next();
});

router.post('/orders', orderController.placeOrder);
router.get('/orders/:id', orderController.getOrder);
router.get('/orders/:id/events', orderController.getOrderEvents);
router.get('/health', orderController.healthCheck);
router.put('/orders/:id', orderController.updateOrder);
router.delete('/orders/:id', orderController.cancelOrder);
router.post('/orders/:id/process', orderController.processOrder);
router.post('/orders/:id/fulfill', orderController.fulfillOrder);
router.get('/orders/:id/track', orderController.trackShipment);

// Metrics endpoint
router.get('/metrics', async (req, res) => {
    try {
        const { register } = require('../common/metrics');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        logger.error('Error generating metrics', { error: err.message });
        res.status(500).send(err.message);
    }
});

module.exports = router;
