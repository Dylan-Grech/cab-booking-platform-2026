const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/customers/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await db.collection('users').where('email', '==', email).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRef = db.collection('users').doc();
    const user = {
      id: userRef.id,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    await userRef.set(user);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ user: userWithoutPassword, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = snapshot.docs[0].data();
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id  (protected)
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const { password: _, ...user } = doc.data();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id/notifications  (protected)
router.get('/:id/notifications', auth, async (req, res) => {
  try {
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', req.params.id)
      .get();

    const notifications = snapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/:id/notifications  (internal — used by other services)
router.post('/:id/notifications', async (req, res) => {
  try {
    const { message, type } = req.body;

    if (!message || !type) {
      return res.status(400).json({ error: 'message and type are required' });
    }

    const notifRef = db.collection('notifications').doc();
    const notification = {
      id: notifRef.id,
      userId: req.params.id,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };

    await notifRef.set(notification);
    res.status(201).json({ notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
