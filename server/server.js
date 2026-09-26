/* ==========================================================================
   server.js
   AI Garment Management System — Backend Server
   Serves static web files and hosts the AI Manager Assistant API.
   ========================================================================== */

'use strict';

const path = require('path');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const assistantRoutes = require('./routes/assistant');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..');

// JSON parser
app.use(express.json());

// CORS & security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-role');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API Routes
app.use('/api/assistant', assistantRoutes);

// Route alias for /manager/assistant
app.get('/manager/assistant', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'manager', 'assistant.html'));
});

// Serve all static frontend files (HTML, CSS, JS, Assets)
app.use(express.static(ROOT_DIR));

// Default root redirect to login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 404 handler for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Start listening
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`  AI Garment Management System is running!`);
  console.log(`  Server URL: http://localhost:${PORT}`);
  console.log(`  AI Assistant: http://localhost:${PORT}/manager/assistant.html`);
  console.log(`  API Status:   http://localhost:${PORT}/api/assistant/status`);
  console.log(`  AI Mode:      ${process.env.OPENAI_API_KEY ? 'OpenAI Live' : 'Demo AI Mode'}`);
  console.log('====================================================');
});
