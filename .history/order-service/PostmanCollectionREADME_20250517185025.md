# Order Management API - Postman Collection Guide

## Introduction

This Postman collection demonstrates a resilient Order Management System built with microservices architecture. It showcases fault tolerance patterns including circuit breakers, retries, and the saga pattern for distributed transactions.

## Collection Features

- **Multiple Success Scenarios**: Demonstrates complete order flows from creation to fulfillment
- **Saga Pattern Implementation**: Shows how distributed transactions maintain consistency across services
- **Resilience Tests**: Illustrates circuit breaker and retry patterns in action
- **Metrics Monitoring**: Provides insight into system health and performance
- **Automated Test Scripts**: Auto-captures order IDs and sets environment variables

## Setup Instructions

1. **Import the Collection**:
   - Open Postman
   - Click Import and select the `EnhancedOrderManagementAPI.postman_collection.json` file

2. **Create Environment Variables**:
   - Create a new environment in Postman
   - The collection's test scripts will automatically populate the following variables:
     - `order_id_1`, `order_id_2`, `order_id_3`, `test_order_id`

3. **Server Configuration**:
   - Ensure the Order Management service is running on `http://localhost:3000`
   - For chaos testing, set the environment variable `CHAOS_MODE=true` on the server

## Running the Collection

### Scenario 1: Basic Order Flow
This demonstrates a complete end-to-end successful order process:
1. Run "Place Order" request in "Successful Order Flow 1"
2. Run subsequent requests in sequence
3. The "Get Order Events" request shows the full order lifecycle

### Scenario 2: Order Flow with Update
Shows a successful order flow with an address update:
1. Run requests in "Successful Order Flow 2" sequentially
2. Notice how the system handles the address update

### Scenario 3: Saga Pattern Demonstration
Illustrates the saga pattern with compensating transactions:
1. Run "Place Order (Inventory Fallback)" request
2. Check "Get Order Events" to see the saga execution
3. Note how the system handles service unavailability

### Scenario 4: Resilience Testing
Tests fault tolerance mechanisms:
1. Enable `CHAOS_MODE=true` on the server
2. Run "Place Order with Retry" to see retry mechanism in action
3. Run "Generate Failed Payments" multiple times to trigger circuit breaker
4. Check "Check Circuit Breaker State" to see circuit breaker metrics
5. Test "Idempotency Test" by running it multiple times with the same key

## Understanding Test Results

- **201 Created**: Successful order creation
- **200 OK**: Successful retrieval or update
- **400 Bad Request**: Invalid request or business rule violation
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: System error or simulated failure (chaos testing)

## Monitoring Metrics

The "Metrics" endpoint provides Prometheus metrics for:
- Circuit breaker states (0=closed, 1=open)
- Retry counts for failed requests
- Request durations
- Order counts by status

## Assignment Deliverables

This enhanced collection satisfies the CSE455 assignment requirements by demonstrating:
1. ✅ Two successful order process flows
2. ✅ Implementation of the saga pattern
3. ✅ Resilience patterns in action (circuit breakers, retries)
4. ✅ Comprehensive error handling and compensation

## Notes

- The collection includes idempotency keys to prevent duplicate operations
- Test scripts automatically extract and store order IDs from responses
- Chaos mode randomly generates 500 errors to test resilience patterns
