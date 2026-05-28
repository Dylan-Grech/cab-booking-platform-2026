const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 8080;

// Inject GATEWAY_URL so the frontend JS knows where to send requests
app.get('/config.js', (req, res) => {
  const raw = process.env.GATEWAY_URL || 'http://localhost:3000';
  const gatewayUrl = raw.startsWith('http') ? raw : `https://${raw}`;
  res.type('application/javascript');
  res.send(`window.GATEWAY_URL = '${gatewayUrl}';`);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));
