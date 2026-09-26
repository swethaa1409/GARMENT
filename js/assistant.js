/* ==========================================================================
   assistant.js — AI Manager Assistant Client Logic
   Strict role enforcement: Administrators only.
   Communicates with POST /api/assistant/chat.
   ========================================================================== */

(() => {
  'use strict';

  // 1. Strict Administrator Role Verification
  const adminSession = AGMS.auth.getSession();
  const workerSession = AGMS.workerAuth ? AGMS.workerAuth.getSession() : null;

  if (!adminSession || (adminSession.role !== 'Administrator' && adminSession.role !== 'Manager')) {
    // If a worker tries to access, or user is unauthenticated, redirect to login
    window.location.href = '../login.html';
    return;
  }

  // 2. DOM Elements
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const welcomeTime = document.getElementById('welcomeTime');

  // Set welcome message timestamp
  if (welcomeTime) {
    welcomeTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Backend API URL resolution: handles direct server (port 3000), Live Server (port 5500, etc.), and file protocol
  const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000'))
    ? 'http://localhost:3000'
    : '';

  // Conversation history array for context continuity
  let conversationHistory = [];

  // 3. Check Backend Assistant Status & Mode
  async function checkAssistantStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/assistant/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.mode === 'real-ai' && data.aiConfigured) {
          statusIndicator.classList.remove('demo-mode');
          statusText.textContent = 'AI Assistant Online';
          statusIndicator.title = 'Live AI model connected (OpenAI)';
        } else {
          statusIndicator.classList.add('demo-mode');
          statusText.textContent = 'Offline / Demo';
          statusIndicator.title = 'Offline / Demo Mode: Real AI API key not configured in .env. Using factory data intelligence.';
        }
      } else {
        statusIndicator.classList.add('demo-mode');
        statusText.textContent = 'Offline / Demo';
      }
    } catch (e) {
      console.warn('Could not fetch assistant status from backend:', e);
      statusIndicator.classList.add('demo-mode');
      statusText.textContent = 'Offline / Demo';
      statusIndicator.title = 'Backend server not responding. Please make sure the server is running on port 3000.';
    }
  }

  checkAssistantStatus();

  // 4. Markdown-lite formatter
  function formatMarkdown(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet points (lines starting with • or * or -)
    const lines = escaped.split('\n');
    let inList = false;
    let html = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isBullet = line.startsWith('•') || line.startsWith('* ') || line.startsWith('- ');

      if (isBullet) {
        if (!inList) {
          html += '<ul style="margin:8px 0;padding-left:20px;">';
          inList = true;
        }
        const bulletText = line.replace(/^[•\*\-]\s*/, '');
        html += `<li style="margin-bottom:4px;">${bulletText}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        if (line) {
          html += `<p style="margin-bottom:8px;">${line}</p>`;
        }
      }
    }

    if (inList) {
      html += '</ul>';
    }

    return html;
  }

  // 5. Scroll to bottom
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // 6. Append User Message
  function appendUserMessage(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = 'message-row user-row';
    row.innerHTML = `
      <div class="msg-avatar user"><i class="fa-solid fa-user-tie"></i></div>
      <div class="msg-bubble">
        <p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <div class="meta-info" style="justify-content:flex-end;">
          <span class="msg-time">${time}</span>
        </div>
      </div>
    `;
    // Insert before typing indicator
    chatMessages.insertBefore(row, typingIndicator);
    scrollToBottom();
  }

  // 7. Append AI Message
  function appendAIMessage(text, usedDemo = false) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    const sourceLabel = usedDemo ? 'Offline / Demo' : 'AI Assistant';

    row.innerHTML = `
      <div class="msg-avatar ai"><i class="fa-solid fa-robot"></i></div>
      <div class="msg-bubble">
        ${formatMarkdown(text)}
        <div class="meta-info">
          <span class="badge-source">${sourceLabel}</span>
          <span class="msg-time">${time}</span>
        </div>
      </div>
    `;
    // Insert before typing indicator
    chatMessages.insertBefore(row, typingIndicator);
    scrollToBottom();
  }

  // 8. Send Message to Backend
  async function sendMessage(text) {
    const message = (text || '').trim();
    if (!message) return;

    // Display user message in UI
    appendUserMessage(message);

    // Clear input
    chatInput.value = '';
    chatInput.focus();

    // Disable input and send button
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Show typing indicator
    typingIndicator.classList.add('active');
    scrollToBottom();

    try {
      const response = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          conversation: conversationHistory.slice(-8),
          session: adminSession || (AGMS.auth && AGMS.auth.getSession ? AGMS.auth.getSession() : null) || { name: 'Admin', role: 'Administrator' }
        })
      });

      const data = await response.json();

      // Hide typing indicator
      typingIndicator.classList.remove('active');

      if (!response.ok) {
        // If rejected as forbidden or server error
        if (response.status === 403) {
          appendAIMessage("Access Denied: AI Manager Assistant is restricted to Administrator/Manager roles only.");
        } else {
          appendAIMessage(data.error || "I couldn't connect to the AI assistant right now. Please check the AI service configuration.");
        }
        return;
      }

      // Append assistant response
      appendAIMessage(data.reply, Boolean(data.usedDemo));

      // Update conversation memory for follow-up questions
      conversationHistory.push({ role: 'user', content: message });
      conversationHistory.push({ role: 'assistant', content: data.reply });

      // Keep recent 12 turns max
      if (conversationHistory.length > 12) {
        conversationHistory = conversationHistory.slice(-12);
      }

    } catch (err) {
      console.error('Chat error:', err);
      typingIndicator.classList.remove('active');
      appendAIMessage("I couldn't connect to the AI assistant right now. Please check the AI service configuration.");
    } finally {
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  // 9. Event Listeners

  // Form submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  // Quick Questions Suggestions (click immediately sends question)
  document.querySelectorAll('.quick-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const question = btn.dataset.question;
      if (question) {
        sendMessage(question);
      }
    });
  });

  // Clear Chat / New Chat
  clearChatBtn.addEventListener('click', () => {
    conversationHistory = [];
    // Remove all message rows except the first welcome row and typing indicator
    const rows = chatMessages.querySelectorAll('.message-row');
    rows.forEach((r, idx) => {
      if (idx > 0) r.remove();
    });
    chatInput.value = '';
    chatInput.focus();
  });

  // Voice Input (Web Speech API)
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isListening = false;

    voiceBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        return;
      }
      try {
        recognition.start();
        isListening = true;
        voiceBtn.classList.add('listening');
        voiceBtn.querySelector('span').textContent = 'Listening...';
      } catch (e) {
        console.error('Voice recognition error:', e);
      }
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatInput.value = transcript;
      sendMessage(transcript);
    };

    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove('listening');
      voiceBtn.querySelector('span').textContent = 'Voice';
    };

    recognition.onerror = () => {
      isListening = false;
      voiceBtn.classList.remove('listening');
      voiceBtn.querySelector('span').textContent = 'Voice';
    };
  } else {
    voiceBtn.addEventListener('click', () => {
      alert('Speech recognition is not supported in your browser. Please type your message in the box.');
    });
  }

  // 10. Sidebar, Dark Mode, and User Profile initialization
  // Dark mode
  const darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) {
    darkToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('agms_theme', isDark ? 'dark' : 'light');
    });
  }

  // Apply saved theme
  const savedTheme = localStorage.getItem('agms_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }

  // Populate user chip
  const user = AGMS.auth.getSession();
  if (user) {
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name || 'Admin');
    document.querySelectorAll('[data-user-avatar]').forEach(el => el.textContent = (user.name || 'A')[0].toUpperCase());
  }

  // Sidebar toggle
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileToggle = document.getElementById('mobileMenuToggle');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('agms_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
  }

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Logout handler
  document.querySelectorAll('[data-logout]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      AGMS.auth.logout();
      window.location.href = '../login.html';
    });
  });

})();
