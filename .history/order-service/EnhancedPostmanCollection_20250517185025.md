# Enhanced Postman Collection for Order Management System

## Overview

This enhanced Postman collection demonstrates a microservices architecture for an Order Management System with comprehensive fault tolerance and resilience patterns. It serves as a practical implementation of the distributed systems concepts covered in CSE455, focusing on the saga pattern, circuit breakers, and retry mechanisms.

## Collection Contents

The collection is organized into four main sections:

### 1. System Status
Endpoints to monitor the health and performance metrics of the system:
- **Health Check**: Verifies that the order service is operational
- **Metrics**: Retrieves Prometheus metrics showing circuit breaker states, retry counts, and request durations

### 2. Successful Order Flow 1: Basic
Demonstrates a complete end-to-end successful order process:
1. Place Order (with idempotency key)
2. Get Order to verify status
3. Process Order
4. Fulfill Order
5. Get Order Events to view the complete lifecycle

### 3. Successful Order Flow 2: With Update
Shows a successful order flow with an additional update step:
1. Place Order
2. Update Order Address
3. Process Order
4. Fulfill Order
5. Get Order Events

### 4. Saga Pattern Demonstration
Illustrates the saga pattern with potential compensation actions:
1. Place Order (potentially triggering inventory fallback)
2. Get Order Events to observe the saga flow

### 5. Resilience Pattern Tests
Tests demonstrating fault tolerance mechanisms:
1. Place Order with Retry (Chaos Mode)
2. Generate Failed Payments (Circuit Breaker Test)  
3. Check Circuit Breaker State
4. Idempotency Test (Duplicate Request)

## Resilience Patterns Demonstrated

### Saga Pattern
The collection demonstrates the saga pattern by:
- Orchestrating a sequence of local transactions for order creation
- Implementing compensating transactions when steps fail
- Maintaining consistency across distributed services
- Recording events at each step for traceability

Example: When placing an order, if payment fails after inventory has been reserved, the system executes a compensating transaction to release the reserved inventory.

### Circuit Breaker
The collection demonstrates the circuit breaker pattern by:
- Isolating failures in dependent services
- Failing fast when a service is unavailable
- Using fallback mechanisms when services are down
- Automatically recovering when services return to normal

Example: After multiple payment failures, the circuit breaker opens to prevent additional calls to the payment service and returns a predefined fallback response.

### Retry Mechanism
The collection demonstrates retry capabilities by:
- Automatically retrying failed requests to transient failures
- Using exponential backoff to avoid overwhelming services
- Tracking retry counts via metrics
- Integrating retry with the circuit breaker pattern

### Idempotency
The collection demonstrates idempotency handling by:
- Using idempotency keys for all write operations
- Ensuring duplicate requests return the same response without causing side effects
- Caching responses for idempotent operations

## How to Use This Collection

1. **Prerequisites**:
   - Order service running on localhost:3000
   - Environment variables set up in Postman

2. **Running the Successful Order Flows**:
   - Execute the requests in sequence within each flow
   - Observe the successful progression through various states
   - View the order events to trace the complete lifecycle

3. **Testing the Saga Pattern**:
   - Run the "Place Order (Inventory Fallback)" request
   - Check the order events to see how the system handles service failures
   - Note how compensating transactions are executed when needed

4. **Testing Resilience Patterns**:
   - Set the CHAOS_MODE environment variable to 'true' on the server
   - Run the resilience test requests multiple times
   - Observe the circuit breaker state in the metrics endpoint
   - Test idempotency by running the same request multiple times

## Automatic Environment Management

The collection includes test scripts that automatically:
- Store order IDs from responses
- Set them as environment variables for subsequent requests
- Track response times and status codes

## Conclusion

This enhanced Postman collection serves as a practical demonstration of microservices architecture with integrated fault tolerance and resilience patterns. It shows how the system can handle service failures gracefully while maintaining data consistency across distributed components through the saga pattern.
