const promClient = require('prom-client');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'shipping-service'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const labelGenerationCounter = new promClient.Counter({
  name: 'shipping_label_generation_total',
  help: 'Total number of shipping label generations',
  labelNames: ['status']
});

const shippingOperationDuration = new promClient.Histogram({
  name: 'shipping_operation_duration_seconds',
  help: 'Duration of shipping operations in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Add circuit breaker state metrics
const circuitBreakerState = new promClient.Gauge({
  name: 'circuit_breaker_state',
  help: 'State of the circuit breaker (0 = closed, 1 = open)',
  labelNames: ['service']
});

// Export the registry and metrics
module.exports = {
  register,
  metrics: {
    labelGenerationCounter,
    shippingOperationDuration,
    circuitBreakerState
  }
};
