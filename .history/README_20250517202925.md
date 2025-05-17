# Fault-Tolerant Order Management Microservices Demo

This repository demonstrates a microservice-based Order Management System with fault tolerance and resilience patterns. It showcases how to design and implement reliable distributed systems using patterns like Saga, Circuit Breaker, and Retries.

## System Architecture

The following diagrams showcase the design of our microservices architecture:

1. **Architecture Diagram**: See `architecture.dot` for a visual representation of the system components and their interactions.

2. **Sequence Diagram**: See `saga_sequence.txt` for a detailed flow of the saga pattern implementation, including successful flows and error handling.

The system consists of three separate microservices:

1. **Order Service**
   - Manages order lifecycle
   - Orchestrates the saga pattern
   - Handles communication with other services

2. **Inventory Service**
   - Manages product inventory
   - Handles inventory checks, reservations, and releases
   - Provides inventory status information

3. **Payment Service**
   - Processes payments
   - Authorizes and refunds transactions
   - Maintains payment records

## Key Features

- **Microservices Architecture**: Each service runs independently with its own database
- **Saga Pattern**: Manages distributed transactions across services
- **Circuit Breakers**: Prevent cascading failures and provide fallbacks
- **Retry Mechanisms**: Handle transient failures gracefully
- **Idempotency**: Safe operation retries without side effects
- **Metrics & Monitoring**: Track system health and performance
- **Docker Support**: Easy deployment with Docker Compose
- **Postman Collection**: Ready-made tests for all features

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm
- Docker and docker-compose (optional, for containerized deployment)

### Setup and Installation

#### Option 1: Running services locally

1. Run the setup script to install dependencies for all services:
   ```
   setup.bat
   ```

2. Start all three services:
   ```
   start-services.bat
   ```

Each service will run on its own port:
- Order Service: http://localhost:3000
- Inventory Service: http://localhost:3001
- Payment Service: http://localhost:3002

#### Option 2: Using Docker

1. Build and start all services using Docker Compose:
   ```
   docker-compose up --build
   ```

### Testing the System

1. Import the Postman collection:
   - Use `OrderManagementMicroservices.postman_collection.json`
   - The collection includes tests for all services and scenarios

2. Follow the steps in the DemoGuide.md file for a guided tour of the system's features

## Resilience Patterns

### Saga Pattern

The saga pattern is implemented to manage distributed transactions:

```
Order Placement Saga:
1. Create Order (Pending)
2. Check & Reserve Inventory
   - If fails: End saga with failure
3. Process Payment
   - If fails: Release Inventory, End saga with failure
4. Confirm Order
```

Each step has a compensating action that runs automatically if a later step fails.

### Circuit Breakers

Circuit breakers protect the system when a service is experiencing issues:

- **Open**: When error rate exceeds threshold, failing fast to prevent cascading failures
- **Half-Open**: Periodically allowing test requests to check if the service has recovered
- **Closed**: Normal operation, requests pass through

### Retry Mechanism

Retries are implemented for transient failures:

- Automatically retry failed requests with exponential backoff
- Configurable retry counts and conditions

## Project Structure

```
/
├── order-service/         # Order management service
│   ├── app.js             # Main application entry point
│   ├── common/            # Shared utilities
│   │   ├── resilience.js  # Circuit breaker implementation
│   │   ├── saga.js        # Saga pattern implementation
│   │   └── ...
│   ├── controller/        # Business logic
│   ├── routes/            # API endpoints
│   └── ...
│
├── inventory-service/     # Inventory management service
│   ├── app.js             # Main application entry point
│   ├── common/            # Shared utilities
│   ├── controller/        # Business logic
│   ├── routes/            # API endpoints
│   └── ...
│
├── payment-service/       # Payment processing service
│   ├── app.js             # Main application entry point
│   ├── common/            # Shared utilities
│   ├── controller/        # Business logic
│   ├── routes/            # API endpoints
│   └── ...
│
├── docker-compose.yml     # Docker Compose configuration
├── DemoGuide.md           # Step-by-step guide to run the demo
├── setup.bat              # Setup script for local development
└── start-services.bat     # Script to start all services locally
```

## Resources

- [DemoGuide.md](DemoGuide.md) - Detailed instructions for running the demo
- [OrderManagementMicroservices.postman_collection.json](OrderManagementMicroservices.postman_collection.json) - Postman collection

## License

This project is provided for educational purposes only. Feel free to use and learn from it.
