// Customer Microservice — handles user registration, login, profile and notifications
// Runs on port 3001 by default
const express = require('express');
const cors = require('cors');
const path = require('path');
// Load .env from this service's own directory regardless of where the process was started
require('dotenv').config({ path: path.join(__dirname, '.env') });
const customerRoutes = require('./routes/customerRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.use('/api/customers', customerRoutes);

// Health check endpoint — used by the gateway and hosting platform to verify the service is up
app.get('/health', (req, res) => res.json({ status: 'Customer service running' }));

app.listen(PORT, () => console.log(`Customer service running on port ${PORT}`));
