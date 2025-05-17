// app.js
// Entry point for the Payment microservice

const express = require('express');
const bodyParser = require('body-parser');
const paymentRoutes = require('./routes/paymentRoutes');
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
app.use('/', paymentRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    logger.info(`Payment Service running on port ${PORT}`);
    console.log(`Payment Service running on port ${PORT}`);
});
