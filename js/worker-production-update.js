/**
 * AI Garment Management System — Worker Production Update Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  AGMS.seedIfNeeded();

  const session = AGMS.workerAuth.requireSession();
  if (!session) return;

  AGMS.initSidebar();

  // Populate header info
  const workerAvatar = document.getElementById('workerAvatar');
  const workerName = document.getElementById('workerName');
  if (workerAvatar) workerAvatar.textContent = (session.name || 'W').charAt(0).toUpperCase();
  if (workerName) workerName.textContent = session.name;

  // Logout
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

  // Today's date
  const puDate = document.getElementById('puDate');
  if (puDate) {
    puDate.value = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const puOrderSelect = document.getElementById('puOrderSelect');
  const puStage = document.getElementById('puStage');
  const puQty = document.getElementById('puQty');
  const puCalcBox = document.getElementById('puCalcBox');
  const puEstEarnings = document.getElementById('puEstEarnings');
  const puNewCompleted = document.getElementById('puNewCompleted');
  const puNotes = document.getElementById('puNotes');
  const puSubmitBtn = document.getElementById('puSubmitBtn');
  const puResetBtn = document.getElementById('puResetBtn');

  let tasks = [];
  let selectedTask = null;

  function loadTasks() {
    tasks = AGMS.workerTasks.forWorker(session.id);
    if (!puOrderSelect) return;

    if (tasks.length === 0) {
      puOrderSelect.innerHTML = '<option value="">No tasks assigned</option>';
      if (puStage) puStage.value = '';
      return;
    }

    puOrderSelect.innerHTML = tasks.map(t => {
      const num = t.orderId.replace('ORD-', '');
      return `<option value="${t.orderId}">Order #${num} — ${AGMS.escapeHtml(t.product)} (${t.completed}/${t.target} done)</option>`;
    }).join('');

    selectedTask = tasks[0];
    if (puStage && selectedTask) puStage.value = selectedTask.stage;

    updateCalcPreview();
  }

  if (puOrderSelect) {
    puOrderSelect.addEventListener('change', () => {
      const orderId = puOrderSelect.value;
      selectedTask = tasks.find(t => t.orderId === orderId);
      if (selectedTask && puStage) {
        puStage.value = selectedTask.stage;
      }
      updateCalcPreview();
    });
  }

  function updateCalcPreview() {
    if (!puQty || !selectedTask) return;
    const qty = parseInt(puQty.value, 10);
    if (isNaN(qty) || qty <= 0) {
      if (puCalcBox) puCalcBox.style.display = 'none';
      return;
    }

    const rate = session.ratePerPiece || 15;
    const est = qty * rate;
    const newTotal = selectedTask.completed + qty;

    if (puEstEarnings) puEstEarnings.textContent = `+₹${est.toLocaleString('en-IN')}`;
    if (puNewCompleted) puNewCompleted.textContent = `${newTotal} / ${selectedTask.target} pieces`;
    if (puCalcBox) puCalcBox.style.display = 'block';
  }

  if (puQty) {
    puQty.addEventListener('input', updateCalcPreview);
  }

  if (puResetBtn) {
    puResetBtn.addEventListener('click', () => {
      if (puQty) puQty.value = '';
      if (puNotes) puNotes.value = '';
      if (puCalcBox) puCalcBox.style.display = 'none';
    });
  }

  if (puSubmitBtn) {
    puSubmitBtn.addEventListener('click', () => {
      if (!selectedTask) {
        AGMS.toast('Please select an order first', 'error');
        return;
      }

      const qty = parseInt(puQty.value, 10);
      if (isNaN(qty) || qty <= 0) {
        AGMS.toast('Please enter a valid positive quantity', 'error');
        puQty.focus();
        return;
      }

      const rate = session.ratePerPiece || 15;
      const earned = qty * rate;

      AGMS.workerTasks.updateCompleted(session.id, selectedTask.orderId, qty);

      AGMS.workerHistory.add({
        workerId: session.id,
        date: new Date().toISOString().slice(0, 10),
        orderId: selectedTask.orderId,
        product: selectedTask.product,
        stage: selectedTask.stage,
        quantity: qty,
        earnings: earned,
        notes: puNotes ? puNotes.value : '',
        status: (selectedTask.completed + qty >= selectedTask.target) ? 'Completed' : 'In Progress'
      });

      AGMS.toast(`Production updated: +${qty} pieces recorded (+₹${earned.toLocaleString('en-IN')})`, 'success');

      if (puQty) puQty.value = '';
      if (puNotes) puNotes.value = '';
      if (puCalcBox) puCalcBox.style.display = 'none';

      loadTasks();
      renderHistory();
    });
  }

  // --- Voice Update Feature ---
  const startVoiceBtn = document.getElementById('startVoiceBtn');
  const voiceBtnText = document.getElementById('voiceBtnText');
  const voiceWaveform = document.getElementById('voiceWaveform');
  const voiceTranscript = document.getElementById('voiceTranscript');
  const voiceDetectedCard = document.getElementById('voiceDetectedCard');
  const detProduct = document.getElementById('detProduct');
  const detStage = document.getElementById('detStage');
  const detQty = document.getElementById('detQty');
  const detEarnings = document.getElementById('detEarnings');
  const confirmVoiceBtn = document.getElementById('confirmVoiceBtn');

  let isRecording = false;
  let recognition = null;
  let voiceData = null;

  function handleVoiceText(text) {
    if (voiceTranscript) {
      voiceTranscript.textContent = `"${text}"`;
      voiceTranscript.style.fontStyle = 'normal';
    }

    const numMatch = text.match(/\d+/);
    let qty = numMatch ? parseInt(numMatch[0], 10) : 30;
    if (qty > 500) qty = 50;

    let stage = selectedTask ? selectedTask.stage : 'Stitching';
    if (/cutting/i.test(text)) stage = 'Cutting';
    else if (/packing/i.test(text)) stage = 'Packing';
    else if (/quality|check/i.test(text)) stage = 'Quality Check';
    else if (/stitching|தையல்|முடிச்சுட்டேன்/i.test(text)) stage = 'Stitching';

    let product = selectedTask ? selectedTask.product : "Men's Cotton Shirt";
    if (/jacket|denim/i.test(text)) product = 'Denim Jacket';
    else if (/trousers|pant/i.test(text)) product = 'Linen Trousers';
    else if (/shirt/i.test(text)) product = "Men's Cotton Shirt";

    const rate = session.ratePerPiece || 15;
    const est = qty * rate;

    voiceData = {
      orderId: selectedTask ? selectedTask.orderId : 'ORD-1042',
      product,
      stage,
      quantity: qty,
      earnings: est
    };

    if (detProduct) detProduct.textContent = product;
    if (detStage) detStage.textContent = stage;
    if (detQty) detQty.textContent = `${qty} pieces`;
    if (detEarnings) detEarnings.textContent = `₹${est.toLocaleString('en-IN')}`;

    if (voiceDetectedCard) voiceDetectedCard.style.display = 'block';
    if (confirmVoiceBtn) confirmVoiceBtn.style.display = 'inline-flex';
  }

  // Sample prompt buttons
  document.querySelectorAll('.voice-example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sample = btn.dataset.text;
      handleVoiceText(sample);
    });
  });

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (startVoiceBtn) {
    startVoiceBtn.addEventListener('click', () => {
      if (isRecording) {
        isRecording = false;
        if (voiceBtnText) voiceBtnText.textContent = 'Start Speaking';
        startVoiceBtn.classList.remove('listening');
        if (voiceWaveform) voiceWaveform.classList.remove('active');
        if (recognition) {
          try { recognition.stop(); } catch (err) {}
        }
        return;
      }

      isRecording = true;
      if (voiceBtnText) voiceBtnText.textContent = 'Listening… Click to Stop';
      startVoiceBtn.classList.add('listening');
      if (voiceWaveform) voiceWaveform.classList.add('active');
      if (voiceTranscript) {
        voiceTranscript.textContent = 'Listening… Please speak now.';
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
            stopVoiceUI();
            handleVoiceText(transcript);
          };

          recognition.onerror = () => {
            simulateVoice();
          };

          recognition.onend = () => {
            if (isRecording) simulateVoice();
          };

          recognition.start();
          return;
        } catch (e) {
          simulateVoice();
          return;
        }
      }

      simulateVoice();
    });
  }

  function stopVoiceUI() {
    isRecording = false;
    if (voiceBtnText) voiceBtnText.textContent = 'Start Speaking';
    if (startVoiceBtn) startVoiceBtn.classList.remove('listening');
    if (voiceWaveform) voiceWaveform.classList.remove('active');
  }

  function simulateVoice() {
    setTimeout(() => {
      stopVoiceUI();
      handleVoiceText("இன்னைக்கு 150 shirts முடிச்சுட்டேன்");
    }, 1800);
  }

  if (confirmVoiceBtn) {
    confirmVoiceBtn.addEventListener('click', () => {
      if (!voiceData) return;

      const rate = session.ratePerPiece || 15;
      const earned = voiceData.quantity * rate;

      AGMS.workerTasks.updateCompleted(session.id, voiceData.orderId, voiceData.quantity);

      AGMS.workerHistory.add({
        workerId: session.id,
        date: new Date().toISOString().slice(0, 10),
        orderId: voiceData.orderId,
        product: voiceData.product,
        stage: voiceData.stage,
        quantity: voiceData.quantity,
        earnings: earned,
        status: 'In Progress'
      });

      AGMS.toast(`Voice update confirmed: +${voiceData.quantity} pieces recorded (+₹${earned.toLocaleString('en-IN')})`, 'success');

      if (voiceDetectedCard) voiceDetectedCard.style.display = 'none';
      if (confirmVoiceBtn) confirmVoiceBtn.style.display = 'none';
      if (voiceTranscript) {
        voiceTranscript.textContent = 'Transcription will appear here…';
        voiceTranscript.style.fontStyle = 'italic';
      }

      loadTasks();
      renderHistory();
    });
  }

  // --- Production History Table ---
  function renderHistory() {
    const historyBody = document.getElementById('puHistoryBody');
    if (!historyBody) return;

    const history = AGMS.workerHistory.forWorker(session.id);
    if (!history || history.length === 0) {
      historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:24px;">No production updates recorded yet.</td></tr>';
      return;
    }

    historyBody.innerHTML = history.slice(0, 6).map(item => {
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

  loadTasks();
  renderHistory();
});
