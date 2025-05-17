# Order Management Demo Collection

## Quick Start Guide

1. **Import Collection**:
   - Import `OrderManagementDemo.postman_collection.json` into Postman
   - Create a new environment in Postman

2. **Run the Demo**:
   Just run the requests in order (1 through 6). Each request automatically:
   - Sets necessary environment variables
   - Validates responses
   - Shows helpful console messages explaining what's happening

### What Each Request Does

1. **Health & Metrics**
   - Check if service is running
   - View circuit breaker states and metrics

2. **Create Order**
   - Creates a new order
   - Demonstrates saga pattern if services fail
   - Automatically saves order ID for next requests

3. **Update Order**
   - Updates the order address
   - Shows successful state changes

4. **Process Order**
   - Attempts to process the order
   - May show fallback behaviors if services are down

5. **Check Events**
   - Shows complete order history
   - Demonstrates saga pattern and compensation
   - Console output explains each event

6. **Retry Test**
   - Demonstrates retry mechanism
   - Shows chaos testing in action

### Features Demonstrated

- ✅ Full Order Flow
- ✅ Saga Pattern (see events timeline)
- ✅ Circuit Breakers (check metrics)
- ✅ Retry Mechanism (chaos mode test)
- ✅ Idempotency (unique keys per request)

### Understanding the Output

- Successful order: Status codes 200/201
- Expected failures: Status code 400 (shows resilience)
- Chaos mode: Status code 500 (shows retries)

### Console Output Guide

The collection provides detailed console output explaining:
- Current operation status
- Saga pattern steps
- Resilience patterns in action
- Compensation actions

No need to run multiple collections or remember complex sequences!
