/**
 * AI Garment Management System — Worker Instructions Controller
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

  // Instruction Modal Elements
  const instModal = document.getElementById('instructionDetailModal');
  const instModalTitle = document.getElementById('instModalTitle');
  const instModalContent = document.getElementById('instModalContent');
  const closeInstModal = document.getElementById('closeInstModal');
  const modalListenBtn = document.getElementById('modalListenBtn');
  let currentModalText = '';

  function closeModal() {
    if (instModal) instModal.classList.remove('open');
  }

  if (closeInstModal) closeInstModal.addEventListener('click', closeModal);
  if (instModal) {
    instModal.addEventListener('click', (e) => {
      if (e.target === instModal) closeModal();
    });
  }

  function playAudio(text, btnElement) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      if (btnElement) {
        const origHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-volume-high fa-beat"></i> Playing…';
        utterance.onend = () => { btnElement.innerHTML = origHTML; };
        utterance.onerror = () => { btnElement.innerHTML = origHTML; };
      }

      window.speechSynthesis.speak(utterance);
    }
    AGMS.toast('Playing audio instruction…', 'info');
  }

  if (modalListenBtn) {
    modalListenBtn.addEventListener('click', () => {
      if (currentModalText) playAudio(currentModalText, modalListenBtn);
    });
  }

  function renderInstructions() {
    const tasks = AGMS.workerTasks.forWorker(session.id);
    const container = document.getElementById('instructionsContainer');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '<div style="background:var(--bg-surface);padding:40px;text-align:center;border-radius:var(--radius-lg);border:1px solid var(--border-soft);color:var(--text-secondary);">No active instructions assigned.</div>';
      return;
    }

    container.innerHTML = tasks.map(t => {
      const orderClean = t.orderId.replace('ORD-', '');
      const priorityClass = (t.priority || '').toLowerCase() === 'high' ? 'high' : (t.priority || '').toLowerCase() === 'medium' ? 'medium' : 'low';
      
      const instructionText = `Complete ${t.stage.toLowerCase()} for ${t.target} pieces of ${t.product} for Order #${orderClean} before ${t.deadline || '6:00 PM today'}. Priority: ${t.priority || 'Normal'}. Ensure 10-12 SPI density and neat edge finishing.`;

      return `
        <div class="instruction-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
            <div>
              <div style="font-size:18px;font-weight:700;">Order #${AGMS.escapeHtml(orderClean)} — ${AGMS.escapeHtml(t.product)}</div>
              <div style="font-size:13px;color:var(--indigo-600);font-weight:600;margin-top:2px;">
                <i class="fa-solid fa-layer-group" style="margin-right:4px;"></i>Stage: ${AGMS.escapeHtml(t.stage)}
              </div>
            </div>
            <span class="instruction-priority ${priorityClass}">
              <i class="fa-solid fa-circle-exclamation"></i> ${AGMS.escapeHtml(t.priority || 'Normal')} Priority
            </span>
          </div>

          <div class="instruction-text">
            Complete <strong>${t.stage.toLowerCase()}</strong> for <strong>${t.target} pieces</strong> of ${AGMS.escapeHtml(t.product)} for Order #${AGMS.escapeHtml(orderClean)} before ${AGMS.escapeHtml(t.deadline || '6:00 PM')}.
          </div>

          <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--text-secondary);margin-bottom:18px;">
            <div><i class="fa-solid fa-clock" style="color:var(--indigo-500);margin-right:4px;"></i>Deadline: <strong>${AGMS.escapeHtml(t.deadline || 'Today 6:00 PM')}</strong></div>
            <div><i class="fa-solid fa-bullseye" style="color:var(--amber-500);margin-right:4px;"></i>Target: <strong>${t.target} pcs</strong></div>
            <div><i class="fa-solid fa-circle-check" style="color:var(--success);margin-right:4px;"></i>Completed: <strong>${t.completed} pcs</strong></div>
          </div>

          <div class="action-row">
            <button class="btn-update read-inst-btn" data-order="${t.orderId}" data-product="${AGMS.escapeHtml(t.product)}" data-stage="${AGMS.escapeHtml(t.stage)}" data-target="${t.target}" data-deadline="${AGMS.escapeHtml(t.deadline || 'Today 6 PM')}" style="padding:8px 18px;font-size:13px;">
              <i class="fa-solid fa-book-open"></i> Read Instructions
            </button>
            <button class="btn-listen listen-inst-btn" data-speech="${AGMS.escapeHtml(instructionText)}" style="padding:8px 18px;font-size:13px;">
              <i class="fa-solid fa-volume-high"></i> Listen
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Wire Read Instructions modal buttons
    container.querySelectorAll('.read-inst-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const order = btn.dataset.order.replace('ORD-', '');
        const product = btn.dataset.product;
        const stage = btn.dataset.stage;
        const target = btn.dataset.target;
        const deadline = btn.dataset.deadline;

        if (instModalTitle) instModalTitle.innerHTML = `<i class="fa-solid fa-book-open" style="color:var(--indigo-500);margin-right:8px;"></i>Order #${order} — Standard Operating Procedure`;

        const details = `
          <div style="background:rgba(74,95,217,0.06);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;">
            <strong>Task Target:</strong> ${target} pieces of ${product}<br>
            <strong>Primary Operation:</strong> ${stage}<br>
            <strong>Completion Deadline:</strong> ${deadline}
          </div>
          <h4 style="margin:12px 0 6px;font-size:14px;">Quality & Technical Requirements:</h4>
          <ul style="padding-left:18px;margin-bottom:14px;list-style:disc;">
            <li>Use 40/2 spun polyester thread matching fabric color.</li>
            <li>Maintain stitch density at 10 to 12 stitches per inch (SPI).</li>
            <li>Ensure seam allowance is maintained at 1/2 inch without puckering.</li>
            <li>Reinforce collar band stitching and bar-tack pocket edges.</li>
            <li>Trim all loose threads before passing bundle to Quality Inspection.</li>
          </ul>
          <div style="color:var(--text-secondary);font-size:12px;">
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--amber-500);margin-right:4px;"></i>
            Report any fabric shading or bundle defects immediately to floor supervisor.
          </div>
        `;

        if (instModalContent) instModalContent.innerHTML = details;
        currentModalText = `Order ${order}, ${product}. Target: ${target} pieces. Operation: ${stage}. Maintain 10 to 12 stitches per inch and ensure clean edge finishing before deadline at ${deadline}.`;

        if (instModal) instModal.classList.add('open');
      });
    });

    // Wire Listen audio buttons
    container.querySelectorAll('.listen-inst-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.speech;
        playAudio(text, btn);
      });
    });
  }

  renderInstructions();
});
