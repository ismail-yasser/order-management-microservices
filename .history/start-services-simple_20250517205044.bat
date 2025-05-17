@echo off
echo ===================================
echo Starting Order Service...
echo ===================================
cd order-service
start cmd /c "node app.js"
cd ..

echo.
echo ===================================
echo Starting Inventory Service...
echo ===================================
cd inventory-service
start cmd /c "node app.js"
cd ..

echo.
echo ===================================
echo Starting Payment Service...
echo ===================================
cd payment-service
start cmd /c "node app.js"
cd ..

echo.
echo ===================================
echo All services started!
echo ===================================
