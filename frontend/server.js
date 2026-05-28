// Frontend server — serves the static web application and injects the gateway URL at runtime
// This allows the same build to work both locally and when deployed to cloud hosting
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 8080;

// Dynamically serve /config.js so the frontend JS knows where the gateway is hosted
// When running locally: http://localhost:3000
// When hosted on Render: the bare hostname is normalised to https://
app.get('/config.js', (req, res) => {
  const raw = process.env.GATEWAY_URL || 'http://localhost:3000';
  const gatewayUrl = raw.startsWith('http') ? raw : `https://${raw}`;
  res.type('application/javascript');
  res.send(`window.GATEWAY_URL = '${gatewayUrl}';`);
});

// Serve all static files (HTML, CSS, JS) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route — serves index.html for any unknown path (supports single-page app navigation)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));
