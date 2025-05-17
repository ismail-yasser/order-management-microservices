// shippingController.js
// Handles business logic for shipping operations

const { v4: uuidv4 } = require('uuid');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const logger = require('../common/logger');
const { metrics } = require('../common/metrics');

// In-memory shipping database
// In a real application, this would be a database
const shipments = {};
const carriers = {
  'STANDARD': { name: 'Standard Shipping', estimatedDays: 5 },
  'EXPRESS': { name: 'Express Shipping', estimatedDays: 2 },
  'OVERNIGHT': { name: 'Overnight Shipping', estimatedDays: 1 }
};

// Store processed requests for idempotency
const processedRequests = new Map();

// Create labels directory if it doesn't exist
const labelsDir = path.join(__dirname, '../labels');
if (!fs.existsSync(labelsDir)) {
  try {
    fs.mkdirSync(labelsDir, { recursive: true });
  } catch (err) {
    logger.error('Failed to create labels directory', { error: err.message });
  }
}

// Generate a shipping label as PDF
async function generateShippingLabel(shipmentData) {
  try {
    const startTime = Date.now();
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();
    
    // Draw shipping label content
    page.drawText('SHIPPING LABEL', {
      x: 50,
      y: height - 50,
      size: 24
    });
    
    // Draw shipment info
    page.drawText(`Tracking #: ${shipmentData.trackingNumber}`, {
      x: 50,
      y: height - 100,
      size: 12
    });
    
    page.drawText(`Order #: ${shipmentData.orderId}`, {
      x: 50,
      y: height - 120,
      size: 12
    });
    
    page.drawText(`Carrier: ${carriers[shipmentData.carrier].name}`, {
      x: 50,
      y: height - 140,
      size: 12
    });
    
    // Draw shipping address
    page.drawText('SHIP TO:', {
      x: 50,
      y: height - 170,
      size: 14,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    const address = shipmentData.shippingAddress;
    page.drawText(`${address.name || 'Customer'}`, {
      x: 50,
      y: height - 190,
      size: 12
    });
    
    page.drawText(`${address.street}`, {
      x: 50,
      y: height - 210,
      size: 12
    });
    
    page.drawText(`${address.city}, ${address.zip}`, {
      x: 50,
      y: height - 230,
      size: 12
    });
    
    page.drawText(`${address.country}`, {
      x: 50,
      y: height - 250,
      size: 12
    });
    
    // Draw barcode placeholder
    page.drawRectangle({
      x: 50,
      y: height - 330,
      width: 200,
      height: 50,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    
    page.drawText('*' + shipmentData.trackingNumber + '*', {
      x: 75,
      y: height - 315,
      size: 16
    });
    
    // Save the PDFBytes to a file
    const pdfBytes = await pdfDoc.save();
    const filePath = path.join(labelsDir, `${shipmentData.trackingNumber}.pdf`);
    
    // Use synchronous write to ensure file is written before response
    fs.writeFileSync(filePath, pdfBytes);
    
    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.shippingOperationDuration.observe({ operation: 'generate_label' }, duration);
    
    logger.info(`Shipping label generated for order ${shipmentData.orderId}`, {
      trackingNumber: shipmentData.trackingNumber,
      carrier: shipmentData.carrier,
      processingTime: duration
    });
    
    return filePath;
  } catch (error) {
    logger.error('Error generating shipping label', { error: error.message });
    throw new Error('Failed to generate shipping label');
  }
}

exports.createShipment = async (req, res) => {
  try {
    const startTime = Date.now();
    const { orderId, items, shippingAddress, carrier = 'STANDARD' } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] || orderId;
    
    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`shipment-${idempotencyKey}`)) {
      logger.info(`Duplicate shipment request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`shipment-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }
    
    if (!orderId || !items || !shippingAddress) {
      const response = { error: 'Missing required fields' };
      if (idempotencyKey) {
        processedRequests.set(`shipment-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }
    
    // Validate carrier
    if (!carriers[carrier]) {
      const response = { error: 'Invalid carrier specified' };
      if (idempotencyKey) {
        processedRequests.set(`shipment-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }
    
    // Simulate a random delay (100-300ms) to mimic processing
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Generate tracking number
    const trackingNumber = `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Create shipment record
    const shipment = {
      id: uuidv4(),
      orderId,
      trackingNumber,
      items,
      shippingAddress,
      carrier,
      status: 'LABEL_GENERATED',
      estimatedDeliveryDays: carriers[carrier].estimatedDays,
      createdAt: new Date().toISOString(),
      events: [
        {
          status: 'LABEL_GENERATED',
          timestamp: new Date().toISOString(),
          location: 'Shipping Center'
        }
      ]
    };
    
    // Generate the shipping label
    try {
      const labelPath = await generateShippingLabel({
        trackingNumber,
        orderId,
        carrier,
        shippingAddress
      });
      
      shipment.labelUrl = `/shipping/labels/${trackingNumber}.pdf`;
      metrics.labelGenerationCounter.inc({ status: 'success' });
    } catch (labelError) {
      logger.error('Error generating label', { error: labelError.message, orderId });
      metrics.labelGenerationCounter.inc({ status: 'failure' });
      
      // We'll still create the shipment, but note the label generation failure
      shipment.labelStatus = 'GENERATION_FAILED';
    }
    
    // Store shipment
    shipments[shipment.id] = shipment;
    
    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    metrics.shippingOperationDuration.observe({ operation: 'create_shipment' }, duration);
    
    // Prepare response
    const result = {
      success: true,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      orderId: shipment.orderId,
      status: shipment.status,
      estimatedDeliveryDays: shipment.estimatedDeliveryDays,
      carrier: carriers[carrier].name,
      labelUrl: shipment.labelUrl
    };
    
    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`shipment-${idempotencyKey}`, { 
        status: 201, 
        body: result 
      });
    }
    
    logger.info(`Shipment created for order ${orderId}`, { 
      shipmentId: shipment.id,
      trackingNumber,
      carrier
    });
    
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating shipment', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getShipment = (req, res) => {
  try {
    const shipment = shipments[req.params.id];
    if (!shipment) {
      logger.info(`Shipment not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    logger.info(`Shipment retrieved: ${req.params.id}`);
    res.json(shipment);
  } catch (error) {
    logger.error('Error retrieving shipment', { error: error.message, shipmentId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.trackShipment = (req, res) => {
  try {
    const trackingNumber = req.params.trackingNumber;
    
    // Find shipment by tracking number
    const shipment = Object.values(shipments).find(s => s.trackingNumber === trackingNumber);
    
    if (!shipment) {
      logger.info(`Shipment not found for tracking number: ${trackingNumber}`);
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Prepare tracking info
    const trackingInfo = {
      trackingNumber: shipment.trackingNumber,
      orderId: shipment.orderId,
      status: shipment.status,
      estimatedDeliveryDays: shipment.estimatedDeliveryDays,
      carrier: carriers[shipment.carrier].name,
      events: shipment.events
    };
    
    logger.info(`Tracking info retrieved for: ${trackingNumber}`);
    res.json(trackingInfo);
  } catch (error) {
    logger.error('Error tracking shipment', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateShipmentStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status, location } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];
    
    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`status-${idempotencyKey}`)) {
      logger.info(`Duplicate status update request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`status-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }
    
    // Find shipment
    const shipment = shipments[id];
    if (!shipment) {
      const response = { error: 'Shipment not found' };
      if (idempotencyKey) {
        processedRequests.set(`status-${idempotencyKey}`, { status: 404, body: response });
      }
      return res.status(404).json(response);
    }
    
    // Update shipment status
    shipment.status = status;
    shipment.events.push({
      status,
      timestamp: new Date().toISOString(),
      location: location || 'Unknown'
    });
    
    const result = {
      success: true,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status
    };
    
    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`status-${idempotencyKey}`, { status: 200, body: result });
    }
    
    logger.info(`Shipment status updated: ${id}`, { status, location });
    res.json(result);
  } catch (error) {
    logger.error('Error updating shipment status', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getLabel = (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const labelPath = path.join(labelsDir, `${trackingNumber}.pdf`);
    
    if (!fs.existsSync(labelPath)) {
      logger.info(`Label not found for tracking number: ${trackingNumber}`);
      return res.status(404).json({ error: 'Label not found' });
    }
    
    logger.info(`Label retrieved for tracking number: ${trackingNumber}`);
    res.contentType('application/pdf');
    res.sendFile(labelPath);
  } catch (error) {
    logger.error('Error retrieving label', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.cancelShipment = (req, res) => {
  try {
    const { id } = req.params;
    const idempotencyKey = req.headers['idempotency-key'];
    
    // Check for idempotency
    if (idempotencyKey && processedRequests.has(`cancel-${idempotencyKey}`)) {
      logger.info(`Duplicate cancellation request detected with idempotency key: ${idempotencyKey}`);
      const cachedResponse = processedRequests.get(`cancel-${idempotencyKey}`);
      return res.status(cachedResponse.status).json(cachedResponse.body);
    }
    
    // Find shipment
    const shipment = shipments[id];
    if (!shipment) {
      const response = { error: 'Shipment not found' };
      if (idempotencyKey) {
        processedRequests.set(`cancel-${idempotencyKey}`, { status: 404, body: response });
      }
      return res.status(404).json(response);
    }
    
    // Check if shipment can be cancelled
    if (shipment.status !== 'LABEL_GENERATED' && shipment.status !== 'READY_FOR_PICKUP') {
      const response = { 
        error: 'Shipment cannot be cancelled in its current status',
        status: shipment.status 
      };
      
      if (idempotencyKey) {
        processedRequests.set(`cancel-${idempotencyKey}`, { status: 400, body: response });
      }
      return res.status(400).json(response);
    }
    
    // Update shipment status
    shipment.status = 'CANCELLED';
    shipment.events.push({
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
      location: 'System'
    });
    
    const result = {
      success: true,
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status
    };
    
    // Store response for idempotency
    if (idempotencyKey) {
      processedRequests.set(`cancel-${idempotencyKey}`, { status: 200, body: result });
    }
    
    logger.info(`Shipment cancelled: ${id}`);
    res.json(result);
  } catch (error) {
    logger.error('Error cancelling shipment', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.healthCheck = (req, res) => {
  // Add more detailed health info in a real app
  res.json({ 
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
