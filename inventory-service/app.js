// app.js
// Entry point for the Inventory microservice

const express = require('express');
const bodyParser = require('body-parser');
const inventoryRoutes = require('./routes/inventoryRoutes');
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
app.use('/', inventoryRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    logger.info(`Inventory Service running on port ${PORT}`);
    console.log(`Inventory Service running on port ${PORT}`);
});
