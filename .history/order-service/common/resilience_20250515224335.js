const CircuitBreaker = require('opossum');
const axios = require('axios');
// Fix for axios-retry import
const axiosRetryLib = require('axios-retry');
const axiosRetry = axiosRetryLib.default || axiosRetryLib;
const logger = require('./logger');

// Configure axios with retry capabilities
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
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
  // Simplified inventory check - in real world, would call the inventory service
  return axios.get('http://inventory-service:3001/inventory/check', { params: { items } });
};

const inventoryServiceBreaker = new CircuitBreaker(checkInventory, inventoryServiceOptions);

// Add listeners
inventoryServiceBreaker.on('open', () => {
  console.log('Inventory service circuit breaker: OPEN');
});

inventoryServiceBreaker.on('close', () => {
  console.log('Inventory service circuit breaker: CLOSED');
});

inventoryServiceBreaker.fallback(async (items) => {
  console.log('Using fallback for inventory service');
  // Return optimistic response to allow critical flow to continue
  return {
    data: {
      available: true,
      usingFallback: true,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        available: true
      }))
    }
  };
});

// Create circuit breaker for payment service
const paymentServiceOptions = {
  timeout: 5000,              // If our function takes longer than 5 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 30000,         // After 30 seconds, try again
};

const processPayment = async (paymentInfo) => {
  // Simplified payment process - in real world, would call the payment service
  return axios.post('http://payment-service:3002/payments/authorize', paymentInfo);
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
