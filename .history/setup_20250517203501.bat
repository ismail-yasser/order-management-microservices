@echo off
echo Installing dependencies for Order Service...
cd order-service
call npm install
cd ..

echo Installing dependencies for Inventory Service...
cd inventory-service
call npm install
cd ..

echo Installing dependencies for Payment Service...
cd payment-service
call npm install
cd ..

echo All dependencies installed successfully!
