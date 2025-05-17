const promClient = require('prom-client');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'order-service'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const orderCounter = new promClient.Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status']
});

const orderProcessingDuration = new promClient.Histogram({
  name: 'order_processing_duration_seconds',
  help: 'Duration of order processing in seconds',
  buckets: [0.1, 0.5, 1, 2, 5]
});

register.registerMetric(orderCounter);
register.registerMetric(orderProcessingDuration);

module.exports = {
  register,
  metrics: {
    orderCounter,
    orderProcessingDuration
  }
};
