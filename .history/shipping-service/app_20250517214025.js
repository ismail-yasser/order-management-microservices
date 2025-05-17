// app.js
// Entry point for the Shipping microservice

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const shippingRoutes = require('./routes/shippingRoutes');
const logger = require('./common/logger');

// Uncaught exception handling
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    // In production, you might want to use a process manager like PM2 to restart
    process.exit(1);
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', { reason, stack: reason.stack });
});

const app = express();

// Middleware
app.use(bodyParser.json());

// Serve static files from the labels directory
app.use('/shipping/labels', express.static(path.join(__dirname, 'labels')));

// Basic error handling middleware
app.use((err, req, res, next) => {
    logger.error('Express error middleware caught an error', { 
        error: err.message, 
        stack: err.stack,
        path: req.path
    });
    res.status(500).json({ error: 'Internal server error' });
});

// Mount routes
app.use('/', shippingRoutes);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    logger.info(`Shipping Service running on port ${PORT}`);
    console.log(`Shipping Service running on port ${PORT}`);
});
