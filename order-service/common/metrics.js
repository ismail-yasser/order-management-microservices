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

// Add circuit breaker state metrics
const circuitBreakerState = new promClient.Gauge({
  name: 'circuit_breaker_state',
  help: 'State of the circuit breaker (0 = closed, 1 = open)',
  labelNames: ['service']
});

// Add retry count metrics
const retryCounter = new promClient.Counter({
  name: 'retry_count',
  help: 'Number of retries for failed requests',
  labelNames: ['service']
});

register.registerMetric(orderCounter);
register.registerMetric(orderProcessingDuration);
register.registerMetric(circuitBreakerState);
register.registerMetric(retryCounter);

module.exports = {
  register,
  metrics: {
    orderCounter,
    orderProcessingDuration,
    circuitBreakerState,
    retryCounter
  }
};
