// shippingRoutes.js
// Defines API routes for shipping operations

const express = require('express');
const router = express.Router();
const shippingController = require('../controller/shippingController');
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

// Shipping routes
router.post('/shipping', shippingController.createShipment);
router.get('/shipping/:id', shippingController.getShipment);
router.get('/shipping/track/:trackingNumber', shippingController.trackShipment);
router.put('/shipping/:id/status', shippingController.updateShipmentStatus);
router.get('/shipping/labels/:trackingNumber', shippingController.getLabel);
router.delete('/shipping/:id', shippingController.cancelShipment);
router.get('/health', shippingController.healthCheck);

// Metrics endpoint
router.get('/metrics', async (req, res) => {
    try {
        const { register } = require('../common/metrics');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        logger.error('Error generating metrics', { error: err.message });
        res.status(500).send('Error generating metrics');
    }
});

module.exports = router;
