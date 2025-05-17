// orderRoutes.js
// Defines API routes for orders

const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');

router.post('/orders', orderController.placeOrder);
router.get('/orders/:id', orderController.getOrder);
router.get('/health', orderController.healthCheck);

module.exports = router;
