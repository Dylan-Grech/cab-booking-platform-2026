const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fareRoutes = require('./routes/fareRoutes');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3004;

app.use('/api/fare', fareRoutes);

app.get('/health', (req, res) => res.json({ status: 'Fare estimation service running' }));

app.listen(PORT, () => console.log(`Fare estimation service running on port ${PORT}`));
