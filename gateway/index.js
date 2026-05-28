// API Gateway — single entry point that proxies requests to the correct microservice
// The frontend communicates only with the gateway, never directly with individual services
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Prepend https:// when Render injects a bare hostname instead of a full URL
function normalizeUrl(val, fallback) {
  if (!val) return fallback;
  if (val.startsWith('http')) return val;
  return `https://${val}`;
}

const CUSTOMER_SERVICE_URL = normalizeUrl(process.env.CUSTOMER_SERVICE_URL, 'http://localhost:3001');
const BOOKING_SERVICE_URL  = normalizeUrl(process.env.BOOKING_SERVICE_URL,  'http://localhost:3002');
const PAYMENT_SERVICE_URL  = normalizeUrl(process.env.PAYMENT_SERVICE_URL,  'http://localhost:3003');
const FARE_SERVICE_URL     = normalizeUrl(process.env.FARE_SERVICE_URL,     'http://localhost:3004');
const LOCATION_SERVICE_URL = normalizeUrl(process.env.LOCATION_SERVICE_URL, 'http://localhost:3005');

// Route each API path to the appropriate microservice
// changeOrigin: true rewrites the Host header so the target service accepts the request
app.use('/api/customers', createProxyMiddleware({ target: CUSTOMER_SERVICE_URL, changeOrigin: true }));
app.use('/api/bookings',  createProxyMiddleware({ target: BOOKING_SERVICE_URL,  changeOrigin: true }));
app.use('/api/payments',  createProxyMiddleware({ target: PAYMENT_SERVICE_URL,  changeOrigin: true }));
app.use('/api/fare',      createProxyMiddleware({ target: FARE_SERVICE_URL,     changeOrigin: true }));
app.use('/api/locations', createProxyMiddleware({ target: LOCATION_SERVICE_URL, changeOrigin: true }));

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'Gateway is running' }));

app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
