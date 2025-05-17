// orderController.js
// Handles business logic for orders

const { v4: uuidv4 } = require('uuid');
const orders = {};

exports.placeOrder = (req, res) => {
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
