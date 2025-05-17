@echo off
echo Starting Order Service...
start cmd /k "cd order-service && npm run dev"

echo Starting Inventory Service...
start cmd /k "cd inventory-service && npm run dev"

echo Starting Payment Service...
start cmd /k "cd payment-service && npm run dev"

echo All services started successfully!
