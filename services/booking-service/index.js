// Booking Microservice — handles creating and retrieving cab bookings
// Runs on port 3002 by default
const express = require('express');
const cors = require('cors');
const path = require('path');
// Load .env from this service's own directory regardless of where the process was started
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.use('/api/bookings', bookingRoutes);

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'Booking service running' }));

app.listen(PORT, () => console.log(`Booking service running on port ${PORT}`));
