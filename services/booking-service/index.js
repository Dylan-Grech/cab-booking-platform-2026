const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.use('/api/bookings', bookingRoutes);

app.get('/health', (req, res) => res.json({ status: 'Booking service running' }));

app.listen(PORT, () => console.log(`Booking service running on port ${PORT}`));
