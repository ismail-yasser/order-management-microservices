// order.js
// Order model definition

/**
 * Order statuses:
 * PENDING: Order created but not yet processed
 * INVENTORY_FAILED: Inventory check failed
 * PAYMENT_FAILED: Payment processing failed
 * PLACED: Order placed successfully, pending fulfillment
 * READY_FOR_SHIPPING: Order has been processed and is ready for shipping
 * SHIPPED: Order has been shipped
 * DELIVERED: Order has been delivered
 * CANCELLED: Order has been cancelled
 */

class Order {
  constructor(data) {
    this.id = data.id;
    this.customer = data.customer;
    this.items = data.items;
    this.shippingAddress = data.shippingAddress;
    this.billingAddress = data.billingAddress || data.shippingAddress;
    this.paymentMethod = data.paymentMethod;
    this.paymentDetails = data.paymentDetails || null;
    this.status = data.status || 'PENDING';
    this.total = data.total || 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.shipping = data.shipping || {
      carrier: data.carrier || 'STANDARD',
      trackingNumber: null,
      shippedAt: null,
      estimatedDeliveryDate: null
    };
  }
  
  update(data) {
    Object.keys(data).forEach(key => {
      if (key === 'shipping' && this.shipping && data.shipping) {
        this.shipping = { ...this.shipping, ...data.shipping };
      } else if (key !== 'id' && key !== 'createdAt') { // Don't update id or createdAt
        this[key] = data[key];
      }
    });
    this.updatedAt = new Date().toISOString();
    return this;
  }
  
  isUpdatable() {
    // Orders can be updated until they're shipped
    const nonUpdatableStatuses = ['SHIPPED', 'DELIVERED', 'CANCELLED'];
    return !nonUpdatableStatuses.includes(this.status);
  }
  
  isCancellable() {
    // Orders can be cancelled until they're shipped
    const cancellableStatuses = ['PENDING', 'PLACED', 'READY_FOR_SHIPPING'];
    return cancellableStatuses.includes(this.status);
  }
}

module.exports = Order;
