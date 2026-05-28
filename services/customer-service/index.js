const express = require('express');
const cors = require('cors');
require('dotenv').config();
const customerRoutes = require('./routes/customerRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.use('/api/customers', customerRoutes);

app.get('/health', (req, res) => res.json({ status: 'Customer service running' }));

app.listen(PORT, () => console.log(`Customer service running on port ${PORT}`));
