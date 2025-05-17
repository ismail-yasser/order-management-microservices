const CircuitBreaker = require('opossum');
const axios = require('axios');
// Fix for axios-retry import
const axiosRetryLib = require('axios-retry');
const axiosRetry = axiosRetryLib.default || axiosRetryLib;
const logger = require('./logger');
const { metrics } = require('./metrics');

// Configure axios with retry capabilities
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    metrics.retryCounter.inc({ service: 'inventory' });
    return retryCount * 1000; // exponential backoff
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  }
});

// Create circuit breaker for inventory service
const inventoryServiceOptions = {
  timeout: 3000,              // If our function takes longer than 3 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 10000,         // After 10 seconds, try again
};

const checkInventory = async (items) => {
  // Call the actual inventory service
  if (!Array.isArray(items)) {
    logger.error('Inventory check expected array of items but received', { items });
    throw new Error('Invalid items format for inventory check');
  }
  // Convert items to string to pass as query param
  return axios.get('http://localhost:3001/inventory/check', { 
    params: { 
      items: JSON.stringify(items) 
    } 
  });
};

// Create a function that routes inventory requests based on the action parameter
const inventoryServiceHandler = async (payload) => {
  if (payload && payload.action === 'release') {
    return releaseInventory(payload.items);
  } else {
    return checkInventory(payload);
  }
};

const inventoryServiceBreaker = new CircuitBreaker(inventoryServiceHandler, inventoryServiceOptions);

// Add listeners
inventoryServiceBreaker.on('open', () => {
  metrics.circuitBreakerState.set({ service: 'inventory' }, 1);
  logger.warn('Inventory service circuit breaker: OPEN');
  console.log('Inventory service circuit breaker: OPEN');
});

inventoryServiceBreaker.on('close', () => {
  metrics.circuitBreakerState.set({ service: 'inventory' }, 0);
  logger.info('Inventory service circuit breaker: CLOSED');
  console.log('Inventory service circuit breaker: CLOSED');
});

// Release inventory is a separate operation
const releaseInventory = async (items) => {
  return axios.post('http://localhost:3001/inventory/release', { 
    items,
    orderId: items.orderId || 'unknown' // Include orderId for idempotency
  });
};

inventoryServiceBreaker.fallback(async (payload) => {
  logger.warn('Using fallback for inventory service', { payload });
  console.log('Using fallback for inventory service');
  
  // Handle different actions in the fallback
  if (payload && payload.action === 'release') {
    logger.info('Inventory release fallback: recording for later retry');
    // In a real system, we would queue this for later retry
    return {
      data: {
        released: true,
        usingFallback: true
      }
    };
  } else {
    // Default fallback for inventory check
    return {
      data: {
        available: true,
        usingFallback: true,
        items: Array.isArray(payload) ? payload.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          available: true
        })) : []
      }
    };
  }
});

// Create circuit breaker for payment service
const paymentServiceOptions = {
  timeout: 5000,              // If our function takes longer than 5 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 30000,         // After 30 seconds, try again
};

const processPayment = async (paymentInfo) => {
  // Call the actual payment service
  return axios.post('http://localhost:3002/payments/authorize', paymentInfo);
};

const paymentServiceBreaker = new CircuitBreaker(processPayment, paymentServiceOptions);

// Add listeners
paymentServiceBreaker.on('open', () => {
  console.log('Payment service circuit breaker: OPEN');
});

paymentServiceBreaker.on('close', () => {
  console.log('Payment service circuit breaker: CLOSED');
});

paymentServiceBreaker.fallback(async () => {
  console.log('Using fallback for payment service');
  throw new Error('Payment service is currently unavailable. Please try again later.');
});

module.exports = {
  inventoryServiceBreaker,
  paymentServiceBreaker,
  axiosClient: axios
};
