const express = require('express');
const cors = require('cors');
require('dotenv').config();
const locationRoutes = require('./routes/locationRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;

app.use('/api/locations', locationRoutes);

app.get('/health', (req, res) => res.json({ status: 'Location service running' }));

app.listen(PORT, () => console.log(`Location service running on port ${PORT}`));
