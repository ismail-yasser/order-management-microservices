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
