// Firebase Admin SDK setup — connects to Firestore using service account credentials
// Credentials are loaded from environment variables (not a JSON file) for security
const admin = require('firebase-admin');
require('dotenv').config();

// Guard against re-initialising when the module is required more than once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Render stores the private key with literal \n — replace them with real newlines
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
module.exports = { db, admin };
