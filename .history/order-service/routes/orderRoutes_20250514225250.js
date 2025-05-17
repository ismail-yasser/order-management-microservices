// orderRoutes.js
// Defines API routes for orders

const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');

router.post('/orders', orderController.placeOrder);
router.get('/orders/:id', orderController.getOrder);
router.get('/health', orderController.healthCheck);
router.put('/orders/:id', orderController.updateOrder);
router.delete('/orders/:id', orderController.cancelOrder);
router.post('/orders/:id/process', orderController.processOrder);
router.post('/orders/:id/fulfill', orderController.fulfillOrder);

module.exports = router;
