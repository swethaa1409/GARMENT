/* ==========================================================================
   aiService.js
   Handles real AI integration with OpenAI and graceful deterministic fallback.
   API keys are strictly kept server-side and never exposed to the client.
   ========================================================================== */

'use strict';

const { buildDemoResponse } = require('./factoryDataService');

let OpenAI;
try {
  OpenAI = require('openai');
} catch (e) {
  OpenAI = null;
}

const SYSTEM_INSTRUCTION = `You are the AI Manager Assistant for a garment manufacturing factory.
You assist the Administrator / Factory Head in monitoring and managing factory operations.
You have direct access to real-time factory data provided in the context.

Guidelines:
1. Always base answers on the supplied factory data context.
2. Use real figures, dates, order IDs, worker names, and quantities.
3. Calculate and explain metrics when relevant (completion %, remaining quantities, profit margins, cost breakdowns).
4. Identify risks, delays, and bottlenecks objectively based on data.
5. Provide practical, prioritized management recommendations.
6. Distinguish facts from recommendations: never claim an action was executed (e.g. "I assigned worker X") unless the system actually did it. Use phrasing like "Consider assigning worker X".
7. Never invent or hallucinate data that is not in the context. If data is missing or unavailable, explicitly state so.
8. Keep responses professional, clear, structured with bullet points, bold highlights, and easy-to-read formatting.`;

/**
 * Check if a valid OpenAI API key is configured.
 */
function isAIConfigured() {
  const apiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';
  return Boolean(apiKey && apiKey !== 'YOUR_KEY' && apiKey !== 'your_openai_api_key_here' && apiKey.length > 5);
}

/**
 * Generate a response to the user's message using OpenAI or Demo Fallback.
 * @param {string} message - Current user message
 * @param {Array} conversation - Recent conversation turns [{ role: 'user'|'assistant', content: string }]
 * @param {Object} context - Selected factory data context from factoryDataService
 * @returns {Promise<{ reply: string, usedDemo: boolean, aiConfigured: boolean, note?: string }>}
 */
async function generateResponse(message, conversation = [], context = {}) {
  const apiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';
  const aiReady = isAIConfigured();

  // If no API key is provided, use deterministic demo fallback
  if (!aiReady) {
    console.warn('[AI Service] Missing or placeholder OPENAI_API_KEY in .env. Live OpenAI models require a valid API key.');
    console.log('[AI Service] Using deterministic Factory Intelligence engine to fulfill request.');
    return {
      reply: buildDemoResponse(message, conversation),
      usedDemo: true,
      aiConfigured: false,
      note: 'OPENAI_API_KEY is not configured in .env. Real AI connection requires an API key.'
    };
  }

  // Attempt real OpenAI completion
  try {
    if (!OpenAI) {
      console.error('[AI Service] Error: The "openai" npm package is not installed or could not be loaded.');
      return {
        reply: buildDemoResponse(message, conversation),
        usedDemo: true,
        aiConfigured: false,
        note: 'OpenAI package not loaded, using factory data mode.'
      };
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    console.log(`[AI Service] Contacting OpenAI API [Model: ${model}]...`);

    const client = new OpenAI({ apiKey });

    // Format context for system prompt
    const contextPrompt = `\n\n--- CURRENT FACTORY DATA CONTEXT ---\n${JSON.stringify(context, null, 2)}\n------------------------------------`;

    // Build message list (system + recent history + current message)
    const messages = [
      {
        role: 'system',
        content: SYSTEM_INSTRUCTION + contextPrompt
      }
    ];

    // Append last 8 conversation messages for context continuity
    if (Array.isArray(conversation)) {
      const recent = conversation.slice(-8);
      for (const turn of recent) {
        if (turn && turn.role && turn.content) {
          messages.push({
            role: turn.role === 'assistant' ? 'assistant' : 'user',
            content: String(turn.content)
          });
        }
      }
    }

    // Append current user message
    messages.push({
      role: 'user',
      content: message
    });

    const completion = await client.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 800
    });

    const reply = completion.choices && completion.choices[0] && completion.choices[0].message
      ? completion.choices[0].message.content
      : 'I could not generate an answer from the factory data. Please try again.';

    console.log('[AI Service] Successfully received response from OpenAI.');

    return {
      reply,
      usedDemo: false,
      aiConfigured: true
    };

  } catch (err) {
    // Specific error classification and server logging (never exposing the secret key)
    const errStatus = err.status || err.statusCode || (err.response ? err.response.status : null);
    const errMsg = err.message || String(err);

    if (errStatus === 401 || errMsg.includes('401') || errMsg.includes('Incorrect API key')) {
      console.error('[AI Service] Authentication Failure (401): The OPENAI_API_KEY in .env is invalid or unauthorized.');
    } else if (errStatus === 429 || errMsg.includes('429') || errMsg.includes('quota')) {
      console.error('[AI Service] Quota Exceeded / Rate Limit (429): OpenAI account quota has been exceeded or rate-limited.');
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || errMsg.includes('fetch failed')) {
      console.error('[AI Service] Connection Error: Could not establish connection to the OpenAI API endpoint.', err.code || errMsg);
    } else if (errStatus === 400 || errMsg.includes('400')) {
      console.error('[AI Service] Malformed Request (400): OpenAI rejected the payload structure:', errMsg);
    } else {
      console.error(`[AI Service] OpenAI API error [Status: ${errStatus || 'unknown'}]:`, errMsg);
    }

    // Graceful fallback to deterministic factory data service so the application never breaks
    const fallbackReply = buildDemoResponse(message, conversation);
    return {
      reply: fallbackReply,
      usedDemo: true,
      aiConfigured: false,
      note: 'AI service temporarily unavailable. Displaying data directly from factory records.'
    };
  }
}

module.exports = {
  isAIConfigured,
  generateResponse
};
