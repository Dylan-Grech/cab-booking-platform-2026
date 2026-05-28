const express = require('express');
const cors = require('cors');
require('dotenv').config();
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;

app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => res.json({ status: 'Payment service running' }));

app.listen(PORT, () => console.log(`Payment service running on port ${PORT}`));
