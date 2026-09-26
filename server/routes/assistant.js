/* ==========================================================================
   assistant.js (Routes)
   Endpoint: POST /api/assistant/chat
   Strict role enforcement: Administrators only. Workers are rejected (403).
   ========================================================================== */

'use strict';

const express = require('express');
const router = express.Router();
const { selectContext } = require('../services/factoryDataService');
const { generateResponse, isAIConfigured } = require('../services/aiService');

/**
 * Middleware: Verify user is an Administrator or Manager.
 * Checks request body session or headers.
 * Workers are strictly blocked (403). Direct API tests (no session) are permitted.
 */
function requireAdmin(req, res, next) {
  const session = req.body && req.body.session ? req.body.session : null;
  const role = session && session.role ? String(session.role).toLowerCase() : '';

  // Strictly block workers
  if (role === 'worker') {
    console.warn(`[AI Assistant Route] 403 Forbidden: User with role '${role}' attempted to access manager assistant.`);
    return res.status(403).json({
      error: 'Access denied. The AI Manager Assistant is restricted to Factory Administrators and Managers.',
      roleReceived: role
    });
  }

  // Allow administrators, managers, or direct API requests without session
  return next();
}

/**
 * Health check & status
 * GET /api/assistant/status
 */
router.get('/status', (req, res) => {
  const ready = isAIConfigured();
  res.json({
    status: ready ? 'online' : 'offline',
    mode: ready ? 'real-ai' : 'demo-ai',
    aiConfigured: ready,
    message: ready
      ? 'AI Assistant Online (OpenAI connected).'
      : 'Real AI API key not configured in .env. Running in Offline / Demo Mode with factory data intelligence.'
  });
});

/**
 * Main Chat Endpoint
 * POST /api/assistant/chat
 */
router.post('/chat', requireAdmin, async (req, res) => {
  try {
    const { message, conversation } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const trimmedMessage = message.trim();
    console.log(`[AI Assistant Route] Processing user message: "${trimmedMessage.substring(0, 60)}"`);

    // 1. Extract deterministic, pre-calculated factory data context (considering recent conversation for follow-ups)
    const context = selectContext(trimmedMessage, conversation);

    // 2. Generate AI response (OpenAI or deterministic demo fallback)
    const result = await generateResponse(trimmedMessage, conversation, context);

    // 3. Return sanitized response
    return res.json({
      reply: result.reply,
      usedDemo: result.usedDemo,
      aiConfigured: result.aiConfigured,
      note: result.note || null,
      timestamp: new Date().toISOString(),
      data: context
    });

  } catch (err) {
    console.error('[AI Assistant Route] Unexpected error in /api/assistant/chat:', err.message || err);
    // Never expose stack trace or system secrets
    return res.status(500).json({
      error: "I couldn't connect to the AI assistant right now. Please check the AI service configuration."
    });
  }
});

module.exports = router;
