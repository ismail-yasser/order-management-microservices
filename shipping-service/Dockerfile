# Dockerfile for Shipping Service
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Create the labels directory
RUN mkdir -p /app/labels

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3003/health || exit 1

# Expose port
EXPOSE 3003

# Start the application
CMD ["npm", "start"]
