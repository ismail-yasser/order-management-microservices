@echo off
echo Starting Order Service...
start cmd /k "cd order-service && npm start"

echo Starting Inventory Service...
start cmd /k "cd inventory-service && npm start"

echo Starting Payment Service...
start cmd /k "cd payment-service && npm start"

echo All services started successfully!
echo.
echo Note: Services are running in standard mode. To stop them, close the command windows.
