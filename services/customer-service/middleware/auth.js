// JWT authentication middleware
// Reads the Bearer token from the Authorization header and verifies it
// If valid, attaches the decoded user payload to req.user and calls next()
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });

  // Support both "Bearer <token>" and raw token formats
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = auth;
