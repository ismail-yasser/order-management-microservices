@echo off
echo ===================================
echo Installing dependencies for Order Service...
echo ===================================
cd order-service
call npm install --no-audit
if %ERRORLEVEL% NEQ 0 (
    echo Error installing Order Service dependencies
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo ===================================
echo Installing dependencies for Inventory Service...
echo ===================================
cd inventory-service
call npm install --no-audit
if %ERRORLEVEL% NEQ 0 (
    echo Error installing Inventory Service dependencies
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo ===================================
echo Installing dependencies for Payment Service...
echo ===================================
cd payment-service
call npm install --no-audit
if %ERRORLEVEL% NEQ 0 (
    echo Error installing Payment Service dependencies
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo ===================================
echo All dependencies installed successfully!
echo ===================================
echo.
echo You can now run the services with:
echo start-services.bat

echo.
echo Installing global dependencies...
call npm install -g nodemon
echo Done!
