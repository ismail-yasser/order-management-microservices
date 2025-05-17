# Order Management Microservice API Documentation

## Overview

This microservice implements a resilient and fault-tolerant order management system for e-commerce, featuring comprehensive fault detection, data consistency mechanisms, idempotent operations, load balancing, monitoring, and deployment strategies.

## Architecture Components

- **Controller Layer**: Handles API requests and responses
- **Service Layer**: Implements business logic with resilience patterns
- **Saga Pattern**: Manages distributed transactions
- **Circuit Breakers**: Prevent cascading failures
- **Event Store**: Tracks all state changes for consistency and auditability

## API Endpoints

### Health and Monitoring
- **GET /health** - Service health check
- **GET /metrics** - Prometheus metrics endpoint

### Order Management
- **POST /orders** - Place a new order (with saga pattern)
- **GET /orders/:id** - Get order details
- **GET /orders/:id/events** - Get order event history
- **PUT /orders/:id** - Update order details
- **DELETE /orders/:id** - Cancel an order
- **POST /orders/:id/process** - Process an order
- **POST /orders/:id/fulfill** - Fulfill an order

## Fault Tolerance Features

### Circuit Breakers
Circuit breakers are implemented for external service calls (inventory and payment) to prevent cascading failures:
- Automatically opens circuit after 50% failures
- Provides fallback mechanisms
- Self-healing with automatic reset after timeout

### Saga Pattern
Order placement implements the saga pattern with compensating transactions:
1. Create Order → Reserve Inventory → Process Payment → Confirm Order
2. If any step fails, execute compensating transactions

### Idempotency
All write operations support idempotency via the `idempotency-key` header:
- Prevents duplicate operations
- Ensures exactly-once semantics
- Returns consistent responses for repeated requests

### Error Handling
- Global error handlers for uncaught exceptions
- Detailed error logging with stack traces
- Graceful degradation with fallbacks

## Monitoring and Observability

### Logging
- Structured JSON logs with Winston
- Log levels: info, warn, error
- Service name and context included in all logs

### Metrics
Prometheus metrics available at `/metrics`:
- Order counts by status
- Order processing duration
- System metrics (memory, CPU)

## Deployment

### Docker Container
- Alpine-based Node.js image
- Health checks configured
- Environment variable configuration

### Kubernetes
- 3+ replicas for high availability
- Rolling update strategy (zero downtime)
- Horizontal Pod Autoscaler
- Resource limits and requests

## Testing Strategy

### Unit Tests
- Controller methods tested with Jest
- Mock dependencies for isolation

### Chaos Testing
- Random failures simulation with `CHAOS_MODE=true`
- Tests resilience under failure conditions

## Getting Started

### Running the Service
```bash
# Start the service
npm start

# Start with chaos testing enabled
npm run chaos:test
```

### Testing with Postman
1. Import the `OrderManagementAPI.postman_collection.json` collection
2. Use the included examples for each endpoint
3. Make note of order IDs returned from create operations
4. Set the `orderId` variable in Postman for subsequent requests
