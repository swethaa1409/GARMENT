/**
 * AI Garment Management System — Worker Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  AGMS.seedIfNeeded();

  const session = AGMS.workerAuth.requireSession();
  if (!session) return;

  // Initialize sidebar
  AGMS.initSidebar();

  // Populate worker header info
  const todayDateEl = document.getElementById('todayDate');
  if (todayDateEl) {
    const today = new Date();
    todayDateEl.textContent = today.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  const workerAvatarEl = document.getElementById('workerAvatar');
  const workerNameEl = document.getElementById('workerName');
  const workerGreetNameEl = document.getElementById('workerGreetName');
  const timeGreetingEl = document.getElementById('timeGreeting');

  if (workerAvatarEl) workerAvatarEl.textContent = (session.name || 'W').charAt(0).toUpperCase();
  if (workerNameEl) workerNameEl.textContent = session.name;
  if (workerGreetNameEl) workerGreetNameEl.textContent = (session.name || 'Worker').split(' ')[0];

  if (timeGreetingEl) {
    const hr = new Date().getHours();
    timeGreetingEl.textContent = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
  }

  // Handle Logout
  const logoutBtn = document.getElementById('workerLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (AGMS.confirmAction('Are you sure you want to log out of Worker Portal?')) {
        AGMS.workerAuth.logout();
        window.location.href = '../login.html';
      }
    });
  }

  // State
  let currentTask = null;

  function renderDashboard() {
    const tasks = AGMS.workerTasks.forWorker(session.id);
    currentTask = AGMS.workerTasks.todayTask(session.id) || tasks[0];

    const rate = session.ratePerPiece || 15;

    if (currentTask) {
      const target = currentTask.target || 0;
      const completed = currentTask.completed || 0;
      const remaining = Math.max(0, target - completed);
      const pct = target > 0 ? ((completed / target) * 100).toFixed(1) : '0';
      const todayEarnings = completed * rate;

      // Summary stat cards
      const statTarget = document.getElementById('statTarget');
      const statCompleted = document.getElementById('statCompleted');
      const statRemaining = document.getElementById('statRemaining');
      const statEarnings = document.getElementById('statEarnings');
      const earToday = document.getElementById('earToday');

      if (statTarget) statTarget.textContent = target;
      if (statCompleted) statCompleted.textContent = completed;
      if (statRemaining) statRemaining.textContent = remaining;
      if (statEarnings) statEarnings.textContent = `₹${todayEarnings.toLocaleString('en-IN')}`;
      if (earToday) earToday.textContent = `₹${todayEarnings.toLocaleString('en-IN')}`;

      // Current Assignment Card
      const assignOrderNum = document.getElementById('assignOrderNum');
      const assignProduct = document.getElementById('assignProduct');
      const assignStage = document.getElementById('assignStage');
      const assignPriority = document.getElementById('assignPriority');
      const assignTarget = document.getElementById('assignTarget');
      const assignDeadline = document.getElementById('assignDeadline');
      const assignCompleted = document.getElementById('assignCompleted');
      const assignPct = document.getElementById('assignPct');
      const assignBar = document.getElementById('assignBar');
      const detailTarget = document.getElementById('detailTarget');
      const detailCompleted = document.getElementById('detailCompleted');
      const detailRemaining = document.getElementById('detailRemaining');

      if (assignOrderNum) assignOrderNum.textContent = `Order #${currentTask.orderId.replace('ORD-', '')}`;
      if (assignProduct) assignProduct.textContent = currentTask.product;
      if (assignStage) assignStage.textContent = currentTask.stage;
      if (assignPriority) assignPriority.textContent = currentTask.priority || 'High';
      if (assignTarget) assignTarget.textContent = `${target} pieces`;
      if (assignDeadline) assignDeadline.textContent = currentTask.deadline || 'Today, 6:00 PM';
      if (assignCompleted) assignCompleted.textContent = `${completed} / ${target} completed`;
      if (assignPct) assignPct.textContent = `${pct}%`;
      if (assignBar) {
        assignBar.style.width = `${Math.min(100, parseFloat(pct))}%`;
        assignBar.className = 'progress-bar-fill' + (parseFloat(pct) >= 100 ? ' done' : parseFloat(pct) >= 80 ? '' : ' warn');
      }
      if (detailTarget) detailTarget.textContent = target;
      if (detailCompleted) detailCompleted.textContent = completed;
      if (detailRemaining) detailRemaining.textContent = remaining;

      // Status badge in greeting
      const overallStatus = document.getElementById('overallStatus');
      if (overallStatus) {
        if (completed >= target) {
          overallStatus.className = 'status-badge status-badge--done';
          overallStatus.innerHTML = '<span class="status-dot"></span> Completed';
        } else if (parseFloat(pct) >= 70) {
          overallStatus.className = 'status-badge status-badge--on-track';
          overallStatus.innerHTML = '<span class="status-dot"></span> On Track';
        } else {
          overallStatus.className = 'status-badge status-badge--attention';
          overallStatus.innerHTML = '<span class="status-dot"></span> Needs Attention';
        }
      }
    }

    renderHistory();
  }

  function renderHistory() {
    const historyBody = document.getElementById('historyBody');
    if (!historyBody) return;

    const history = AGMS.workerHistory.forWorker(session.id);
    if (!history || history.length === 0) {
      historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">No production updates recorded yet.</td></tr>';
      return;
    }

    const recent = history.slice(0, 5);
    historyBody.innerHTML = recent.map(item => {
      const orderClean = item.orderId ? item.orderId.replace('ORD-', '') : '—';
      const statusBadge = item.status === 'Completed'
        ? '<span class="status-badge status-badge--done" style="padding:2px 8px;font-size:11px;">Completed</span>'
        : '<span class="status-badge status-badge--on-track" style="padding:2px 8px;font-size:11px;">In Progress</span>';

      return `
        <tr>
          <td><strong>${AGMS.formatDate(item.date)}</strong></td>
          <td>
            <strong>#${AGMS.escapeHtml(orderClean)}</strong><br>
            <small style="color:var(--text-secondary);">${AGMS.escapeHtml(item.product || '')}</small>
          </td>
          <td><span style="background:rgba(74,95,217,0.08);color:var(--indigo-600);padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">${AGMS.escapeHtml(item.stage || '')}</span></td>
          <td><strong>${item.quantity}</strong> pcs</td>
          <td style="color:var(--amber-500);font-weight:700;">₹${Number(item.earnings || 0).toLocaleString('en-IN')}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // --- Production Update Modal ---
  const updateModal = document.getElementById('updateModal');
  const openUpdateModal = document.getElementById('openUpdateModal');
  const openUpdateModal2 = document.getElementById('openUpdateModal2');
  const closeUpdateModal = document.getElementById('closeUpdateModal');
  const submitUpdate = document.getElementById('submitUpdate');
  const modalOrder = document.getElementById('modalOrder');
  const modalStage = document.getElementById('modalStage');
  const modalQty = document.getElementById('modalQty');
  const modalDate = document.getElementById('modalDate');
  const modalNotes = document.getElementById('modalNotes');

  function openModal() {
    if (!currentTask) return;
    if (modalOrder) modalOrder.value = `Order #${currentTask.orderId.replace('ORD-', '')} — ${currentTask.product}`;
    if (modalStage) modalStage.value = currentTask.stage;
    if (modalDate) modalDate.value = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (modalQty) {
      modalQty.value = '';
      modalQty.focus();
    }
    if (modalNotes) modalNotes.value = '';
    if (updateModal) updateModal.classList.add('open');
  }

  function closeModal() {
    if (updateModal) updateModal.classList.remove('open');
  }

  if (openUpdateModal) openUpdateModal.addEventListener('click', openModal);
  if (openUpdateModal2) openUpdateModal2.addEventListener('click', openModal);
  if (closeUpdateModal) closeUpdateModal.addEventListener('click', closeModal);
  if (updateModal) {
    updateModal.addEventListener('click', (e) => {
      if (e.target === updateModal) closeModal();
    });
  }

  if (submitUpdate) {
    submitUpdate.addEventListener('click', () => {
      const qty = parseInt(modalQty.value, 10);
      if (isNaN(qty) || qty <= 0) {
        AGMS.toast('Please enter a valid positive quantity', 'error');
        modalQty.focus();
        return;
      }

      const rate = session.ratePerPiece || 15;
      const earned = qty * rate;

      // Update task
      AGMS.workerTasks.updateCompleted(session.id, currentTask.orderId, qty);

      // Add to history
      AGMS.workerHistory.add({
        workerId: session.id,
        date: new Date().toISOString().slice(0, 10),
        orderId: currentTask.orderId,
        product: currentTask.product,
        stage: currentTask.stage,
        quantity: qty,
        earnings: earned,
        status: (currentTask.completed + qty >= currentTask.target) ? 'Completed' : 'In Progress'
      });

      closeModal();
      AGMS.toast(`Production updated: +${qty} pieces recorded (+₹${earned.toLocaleString('en-IN')})`, 'success');
      renderDashboard();
    });
  }

  // --- Voice Update Modal ---
  const voiceModal = document.getElementById('voiceModal');
  const openVoiceModal = document.getElementById('openVoiceModal');
  const closeVoiceModal = document.getElementById('closeVoiceModal');
  const startVoiceBtn = document.getElementById('startVoiceBtn');
  const voiceBtnText = document.getElementById('voiceBtnText');
  const voiceWaveform = document.getElementById('voiceWaveform');
  const voiceTranscript = document.getElementById('voiceTranscript');
  const voiceDetected = document.getElementById('voiceDetected');
  const detectedOrder = document.getElementById('detectedOrder');
  const detectedQty = document.getElementById('detectedQty');
  const detectedStage = document.getElementById('detectedStage');
  const confirmVoice = document.getElementById('confirmVoice');

  let isRecording = false;
  let recognition = null;
  let detectedData = null;

  function openVoice() {
    isRecording = false;
    detectedData = null;
    if (voiceBtnText) voiceBtnText.textContent = 'Start Recording';
    if (startVoiceBtn) startVoiceBtn.classList.remove('listening');
    if (voiceWaveform) voiceWaveform.classList.remove('active');
    if (voiceTranscript) {
      voiceTranscript.textContent = 'Transcription will appear here… (Click Start Recording or Speak)';
      voiceTranscript.style.fontStyle = 'italic';
    }
    if (voiceDetected) voiceDetected.style.display = 'none';
    if (confirmVoice) confirmVoice.style.display = 'none';
    if (voiceModal) voiceModal.classList.add('open');
  }

  function closeVoice() {
    if (recognition && isRecording) {
      try { recognition.stop(); } catch (err) {}
    }
    isRecording = false;
    if (voiceModal) voiceModal.classList.remove('open');
  }

  if (openVoiceModal) openVoiceModal.addEventListener('click', openVoice);
  if (closeVoiceModal) closeVoiceModal.addEventListener('click', closeVoice);
  if (voiceModal) {
    voiceModal.addEventListener('click', (e) => {
      if (e.target === voiceModal) closeVoice();
    });
  }

  function processVoiceInput(text) {
    if (voiceTranscript) {
      voiceTranscript.textContent = `"${text}"`;
      voiceTranscript.style.fontStyle = 'normal';
    }

    // Extract numbers from text (e.g. "150", "30", "38")
    const numMatch = text.match(/\d+/);
    let qty = numMatch ? parseInt(numMatch[0], 10) : 38;
    if (qty > 500) qty = 50;

    let stage = currentTask ? currentTask.stage : 'Stitching';
    if (/cutting/i.test(text)) stage = 'Cutting';
    else if (/packing/i.test(text)) stage = 'Packing';
    else if (/quality|check/i.test(text)) stage = 'Quality Check';
    else if (/stitching|தையல்|முடிச்சுட்டேன்/i.test(text)) stage = 'Stitching';

    let orderNum = currentTask ? `Order #${currentTask.orderId.replace('ORD-', '')}` : 'Order #1042';

    detectedData = {
      orderId: currentTask ? currentTask.orderId : 'ORD-1042',
      product: currentTask ? currentTask.product : "Men's Cotton Shirt",
      stage,
      quantity: qty
    };

    if (detectedOrder) detectedOrder.textContent = orderNum;
    if (detectedQty) detectedQty.textContent = `${qty} pieces`;
    if (detectedStage) detectedStage.textContent = stage;

    if (voiceDetected) voiceDetected.style.display = 'flex';
    if (confirmVoice) confirmVoice.style.display = 'inline-flex';
  }

  // Setup Web Speech API or realistic prototype simulation
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (startVoiceBtn) {
    startVoiceBtn.addEventListener('click', () => {
      if (isRecording) {
        // Stop recording
        isRecording = false;
        if (voiceBtnText) voiceBtnText.textContent = 'Start Recording';
        startVoiceBtn.classList.remove('listening');
        if (voiceWaveform) voiceWaveform.classList.remove('active');
        if (recognition) {
          try { recognition.stop(); } catch (err) {}
        }
        return;
      }

      // Start recording
      isRecording = true;
      if (voiceBtnText) voiceBtnText.textContent = 'Listening… Click to Stop';
      startVoiceBtn.classList.add('listening');
      if (voiceWaveform) voiceWaveform.classList.add('active');
      if (voiceTranscript) {
        voiceTranscript.textContent = 'Listening to voice input…';
        voiceTranscript.style.fontStyle = 'italic';
      }

      if (SpeechRec) {
        try {
          recognition = new SpeechRec();
          recognition.lang = 'ta-IN, en-IN, en-US';
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;

          recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            isRecording = false;
            if (voiceBtnText) voiceBtnText.textContent = 'Start Recording';
            startVoiceBtn.classList.remove('listening');
            if (voiceWaveform) voiceWaveform.classList.remove('active');
            processVoiceInput(transcript);
          };

          recognition.onerror = () => {
            // Fallback gracefully to demo voice simulation if mic error or permission denied
            runVoiceSimulation();
          };

          recognition.onend = () => {
            if (isRecording) {
              runVoiceSimulation();
            }
          };

          recognition.start();
          return;
        } catch (err) {
          runVoiceSimulation();
          return;
        }
      }

      // Fallback simulation
      runVoiceSimulation();
    });
  }

  function runVoiceSimulation() {
    const samples = [
      "இன்னைக்கு 150 shirts முடிச்சுட்டேன்",
      "Today completed 38 shirts for Order #1042 stitching",
      "Finished 25 shirts stitching this afternoon"
    ];
    const sample = samples[Math.floor(Math.random() * samples.length)];

    setTimeout(() => {
      isRecording = false;
      if (voiceBtnText) voiceBtnText.textContent = 'Start Recording';
      if (startVoiceBtn) startVoiceBtn.classList.remove('listening');
      if (voiceWaveform) voiceWaveform.classList.remove('active');
      processVoiceInput(sample);
    }, 1800);
  }

  if (confirmVoice) {
    confirmVoice.addEventListener('click', () => {
      if (!detectedData) return;

      const rate = session.ratePerPiece || 15;
      const earned = detectedData.quantity * rate;

      AGMS.workerTasks.updateCompleted(session.id, detectedData.orderId, detectedData.quantity);

      AGMS.workerHistory.add({
        workerId: session.id,
        date: new Date().toISOString().slice(0, 10),
        orderId: detectedData.orderId,
        product: detectedData.product,
        stage: detectedData.stage,
        quantity: detectedData.quantity,
        earnings: earned,
        status: 'In Progress'
      });

      closeVoice();
      AGMS.toast(`Voice update confirmed: +${detectedData.quantity} pieces recorded (+₹${earned.toLocaleString('en-IN')})`, 'success');
      renderDashboard();
    });
  }

  // --- Listen to Instruction ---
  const listenBtn = document.getElementById('listenInstruction');
  if (listenBtn) {
    listenBtn.addEventListener('click', () => {
      const instructionText = `Today's instruction: Complete stitching for 150 pieces of Men's Cotton Shirt for Order 1042 before 6:00 PM today. Priority: High.`;
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(instructionText);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        listenBtn.innerHTML = '<i class="fa-solid fa-volume-high fa-beat"></i> Playing…';
        utterance.onend = () => {
          listenBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
        };
        utterance.onerror = () => {
          listenBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
        };
        window.speechSynthesis.speak(utterance);
      }
      AGMS.toast('Playing audio instruction for Order #1042…', 'info');
    });
  }

  // Initial render
  renderDashboard();
});
