// Simple Order Microservice using Node.js and Express
// File: orderService.js

const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

// In-memory order store
const orders = {};

// Place a new order
app.post('/orders', (req, res) => {
    const { customer, items, shippingAddress } = req.body;
    if (!customer || !items || !shippingAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const orderId = uuidv4();
    orders[orderId] = {
        id: orderId,
        customer,
        items,
        shippingAddress,
        status: 'PLACED',
        createdAt: new Date().toISOString()
    };
    res.status(201).json({ orderId, status: 'PLACED' });
});

// Get order status
app.get('/orders/:id', (req, res) => {
    const order = orders[req.params.id];
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
});
