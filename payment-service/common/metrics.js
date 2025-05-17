const promClient = require('prom-client');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'payment-service'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const paymentCounter = new promClient.Counter({
  name: 'payments_total',
  help: 'Total number of payment operations',
  labelNames: ['status']
});

const paymentProcessingDuration = new promClient.Histogram({
  name: 'payment_processing_duration_seconds',
  help: 'Duration of payment processing in seconds',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Add circuit breaker state metrics
const circuitBreakerState = new promClient.Gauge({
  name: 'circuit_breaker_state',
  help: 'State of the circuit breaker (0 = closed, 1 = open)',
  labelNames: ['service']
});

// Add retry metrics
const retryCounter = new promClient.Counter({
  name: 'retry_attempts_total',
  help: 'Total number of retry attempts',
  labelNames: ['service']
});

// Export the registry and metrics
module.exports = {
  register,
  metrics: {
    paymentCounter,
    paymentProcessingDuration,
    circuitBreakerState,
    retryCounter
  }
};
