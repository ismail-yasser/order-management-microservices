const promClient = require('prom-client');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'inventory-service'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const inventoryCheckCounter = new promClient.Counter({
  name: 'inventory_checks_total',
  help: 'Total number of inventory checks',
  labelNames: ['status']
});

const inventoryReleaseCounter = new promClient.Counter({
  name: 'inventory_releases_total',
  help: 'Total number of inventory releases',
  labelNames: ['status']
});

const inventoryOperationDuration = new promClient.Histogram({
  name: 'inventory_operation_duration_seconds',
  help: 'Duration of inventory operations in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
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
    inventoryCheckCounter,
    inventoryReleaseCounter,
    inventoryOperationDuration,
    circuitBreakerState,
    retryCounter
  }
};
