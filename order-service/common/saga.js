// saga.js - Implements saga pattern for distributed transactions
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const axios = require('axios');
const { inventoryServiceBreaker, paymentServiceBreaker, shippingServiceBreaker } = require('./resilience');

// In-memory event store - in production, use a persistent store
const eventStore = [];

// Record an event to the event store
const recordEvent = (type, payload) => {
  const event = {
    eventId: uuidv4(),
    eventType: type,
    timestamp: new Date().toISOString(),
    payload
  };
  eventStore.push(event);
  logger.info(`Event recorded: ${type}`, { event });
  return event;
};

// Execute the order placement saga
const executeOrderPlacementSaga = async (orderData, orders) => {
  const sagaId = uuidv4();
  const orderId = uuidv4();
  
  try {
    // Step 1: Create order with PENDING status
    recordEvent('ORDER_CREATED', { sagaId, orderId, status: 'PENDING', ...orderData });
    const order = {
      id: orderId,
      customer: orderData.customer,
      items: orderData.items,
      shippingAddress: orderData.shippingAddress,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    orders[orderId] = order;
    
    try {
      // Step 2: Check inventory first
      logger.info(`Checking inventory for order ${orderId}`);
      const inventoryStart = Date.now();
      const inventoryCheckResult = await inventoryServiceBreaker.fire(orderData.items);
      logger.info(`Inventory check completed in ${Date.now() - inventoryStart}ms`);
      
      if (!inventoryCheckResult.data.available && !inventoryCheckResult.data.usingFallback) {
        recordEvent('INVENTORY_CHECK_FAILED', { sagaId, orderId });
        order.status = 'INVENTORY_FAILED';
        return { success: false, orderId, status: 'INVENTORY_FAILED' };
      }
      
      // Step 2b: Reserve inventory
      logger.info(`Reserving inventory for order ${orderId}`);
      const reserveStart = Date.now();
      const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3001';
      const reserveResult = await axios.post(`${inventoryServiceUrl}/inventory/reserve`, {
        items: orderData.items,
        orderId: orderId
      });
      logger.info(`Inventory reservation completed in ${Date.now() - reserveStart}ms`);
      
      if (!reserveResult.data.reserved) {
        recordEvent('INVENTORY_RESERVATION_FAILED', { sagaId, orderId });
        order.status = 'INVENTORY_FAILED';
        return { success: false, orderId, status: 'INVENTORY_RESERVATION_FAILED' };
      }
      
      recordEvent('INVENTORY_RESERVED', { sagaId, orderId });
      
      try {
        // Step 3: Process payment
        logger.info(`Processing payment for order ${orderId}`);
        const paymentStart = Date.now();
        await paymentServiceBreaker.fire({ 
          orderId, 
          amount: calculateTotal(orderData.items),
          paymentMethod: orderData.paymentMethod || 'credit_card'
        });
        logger.info(`Payment processing completed in ${Date.now() - paymentStart}ms`);
        
        recordEvent('PAYMENT_PROCESSED', { sagaId, orderId });
        
        // All steps successful - confirm order
        order.status = 'PLACED';
        recordEvent('ORDER_PLACED', { sagaId, orderId });
        
        return { success: true, orderId, status: 'PLACED' };
      } catch (paymentError) {
        // Payment failed - compensate inventory and update order
        logger.error(`Payment failed for order ${orderId}`, { error: paymentError.message });
        recordEvent('PAYMENT_FAILED', { sagaId, orderId, error: paymentError.message });          // Compensating action: release inventory
          try {
            const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3001';
            await axios.post(`${inventoryServiceUrl}/inventory/release`, { 
              items: orderData.items,
              orderId: orderId
            });
            recordEvent('INVENTORY_RELEASED', { sagaId, orderId });
          } catch (releaseError) {
            logger.error(`Failed to release inventory for order ${orderId}`, { error: releaseError.message });
            recordEvent('INVENTORY_RELEASE_FAILED', { sagaId, orderId, error: releaseError.message });
          }
        
        order.status = 'PAYMENT_FAILED';
        return { success: false, orderId, status: 'PAYMENT_FAILED', error: paymentError.message };
      }
    } catch (inventoryError) {
      // Inventory check failed
      logger.error(`Inventory check failed for order ${orderId}`, { error: inventoryError.message });
      recordEvent('INVENTORY_CHECK_FAILED', { sagaId, orderId, error: inventoryError.message });
      
      order.status = 'INVENTORY_CHECK_FAILED';
      return { success: false, orderId, status: 'INVENTORY_CHECK_FAILED', error: inventoryError.message };
    }
  } catch (error) {
    // Unexpected error in saga
    logger.error(`Unexpected error in order placement saga`, { error: error.message });
    recordEvent('SAGA_FAILED', { sagaId, error: error.message });
    return { success: false, error: error.message };
  }
};

// Helper to calculate order total
function calculateTotal(items) {
  // In a real app, would fetch prices from product service
  // For now, use a dummy price of $10 per item
  return items.reduce((total, item) => total + (item.quantity * 10), 0);
}

// Get all events for an order (for audit and debugging)
const getOrderEvents = (orderId) => {
  return eventStore.filter(event => 
    event.payload && event.payload.orderId === orderId
  );
};

module.exports = {
  executeOrderPlacementSaga,
  recordEvent,
  getOrderEvents
};
