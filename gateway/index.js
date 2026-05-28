const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001';
const BOOKING_SERVICE_URL  = process.env.BOOKING_SERVICE_URL  || 'http://localhost:3002';
const PAYMENT_SERVICE_URL  = process.env.PAYMENT_SERVICE_URL  || 'http://localhost:3003';
const FARE_SERVICE_URL     = process.env.FARE_SERVICE_URL     || 'http://localhost:3004';
const LOCATION_SERVICE_URL = process.env.LOCATION_SERVICE_URL || 'http://localhost:3005';

app.use('/api/customers', createProxyMiddleware({ target: CUSTOMER_SERVICE_URL, changeOrigin: true }));
app.use('/api/bookings',  createProxyMiddleware({ target: BOOKING_SERVICE_URL,  changeOrigin: true }));
app.use('/api/payments',  createProxyMiddleware({ target: PAYMENT_SERVICE_URL,  changeOrigin: true }));
app.use('/api/fare',      createProxyMiddleware({ target: FARE_SERVICE_URL,     changeOrigin: true }));
app.use('/api/locations', createProxyMiddleware({ target: LOCATION_SERVICE_URL, changeOrigin: true }));

app.get('/health', (req, res) => res.json({ status: 'Gateway is running' }));

app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
