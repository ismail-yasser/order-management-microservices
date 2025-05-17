// inventoryRoutes.js
// Defines API routes for inventory management

const express = require('express');
const router = express.Router();
const inventoryController = require('../controller/inventoryController');
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

// Inventory routes
router.get('/inventory/check', inventoryController.checkInventory);
router.post('/inventory/reserve', inventoryController.reserveInventory);
router.post('/inventory/release', inventoryController.releaseInventory);
router.get('/inventory/status', inventoryController.getInventoryStatus);
router.get('/health', inventoryController.healthCheck);

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
