/**
 * AI Garment Management System — Worker Tasks Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  AGMS.seedIfNeeded();

  const session = AGMS.workerAuth.requireSession();
  if (!session) return;

  AGMS.initSidebar();

  // Populate worker header info
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

  // Quick Modal Elements
  const quickModal = document.getElementById('quickUpdateModal');
  const quickModalOrder = document.getElementById('quickModalOrder');
  const quickModalStage = document.getElementById('quickModalStage');
  const quickModalQty = document.getElementById('quickModalQty');
  const closeQuickModal = document.getElementById('closeQuickModal');
  const submitQuickUpdate = document.getElementById('submitQuickUpdate');
  let selectedOrderId = null;
  let selectedProduct = null;
  let selectedStage = null;
  let selectedTarget = 0;
  let selectedCompleted = 0;

  function renderTasks() {
    const tasks = AGMS.workerTasks.forWorker(session.id);
    const container = document.getElementById('taskListContainer');

    // Summary stats
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.completed >= t.target).length;
    const inProgressCount = tasks.filter(t => t.completed > 0 && t.completed < t.target).length;
    const totalPieces = tasks.reduce((sum, t) => sum + (t.target || 0), 0);

    const statTotal = document.getElementById('taskStatTotal');
    const statInProgress = document.getElementById('taskStatInProgress');
    const statCompleted = document.getElementById('taskStatCompleted');
    const statPieces = document.getElementById('taskStatPieces');

    if (statTotal) statTotal.textContent = totalCount;
    if (statInProgress) statInProgress.textContent = inProgressCount;
    if (statCompleted) statCompleted.textContent = completedCount;
    if (statPieces) statPieces.textContent = totalPieces;

    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '<div style="background:var(--bg-surface);padding:40px;text-align:center;border-radius:var(--radius-lg);border:1px solid var(--border-soft);color:var(--text-secondary);">No tasks currently assigned to you.</div>';
      return;
    }

    container.innerHTML = tasks.map(t => {
      const orderClean = t.orderId.replace('ORD-', '');
      const pct = t.target > 0 ? ((t.completed / t.target) * 100).toFixed(1) : 0;
      const remaining = Math.max(0, t.target - t.completed);

      const priorityClass = (t.priority || '').toLowerCase() === 'high' ? 'high' : (t.priority || '').toLowerCase() === 'medium' ? 'medium' : 'low';
      const statusClass = t.completed >= t.target
        ? 'status-badge--done'
        : (t.status === 'On Track' || parseFloat(pct) >= 70)
        ? 'status-badge--on-track'
        : t.completed === 0
        ? 'status-badge--delayed'
        : 'status-badge--attention';

      const barClass = t.completed >= t.target ? 'done' : parseFloat(pct) >= 80 ? '' : 'warn';

      return `
        <div class="task-card">
          <div class="task-card-head">
            <div>
              <div class="task-order">Order #${AGMS.escapeHtml(orderClean)}</div>
              <div class="task-product">${AGMS.escapeHtml(t.product)}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="instruction-priority ${priorityClass}" style="margin-bottom:0;">
                <i class="fa-solid fa-flag"></i> ${AGMS.escapeHtml(t.priority || 'Normal')}
              </span>
              <span class="status-badge ${statusClass}">
                <span class="status-dot"></span> ${AGMS.escapeHtml(t.status || 'Active')}
              </span>
            </div>
          </div>

          <div class="task-progress-row">
            <div class="task-stat">
              <span>Stage</span>
              <span style="color:var(--indigo-600);"><i class="fa-solid fa-layer-group" style="font-size:12px;margin-right:4px;"></i>${AGMS.escapeHtml(t.stage)}</span>
            </div>
            <div class="task-stat">
              <span>Target</span>
              <span>${t.target} pcs</span>
            </div>
            <div class="task-stat">
              <span>Completed</span>
              <span style="color:var(--success);">${t.completed} pcs</span>
            </div>
            <div class="task-stat">
              <span>Remaining</span>
              <span style="color:var(--amber-500);">${remaining} pcs</span>
            </div>
            <div class="task-stat">
              <span>Deadline</span>
              <span class="task-deadline"><i class="fa-solid fa-clock"></i>${AGMS.escapeHtml(t.deadline || 'Today 6 PM')}</span>
            </div>
          </div>

          <div class="progress-section" style="margin-bottom:16px;">
            <div class="progress-header">
              <span class="progress-label">${t.completed} of ${t.target} completed</span>
              <span class="progress-pct">${pct}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(100, parseFloat(pct))}%"></div>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button class="btn-update quick-update-btn" data-order="${t.orderId}" data-product="${AGMS.escapeHtml(t.product)}" data-stage="${AGMS.escapeHtml(t.stage)}" data-target="${t.target}" data-completed="${t.completed}" style="padding:8px 16px;font-size:13px;">
              <i class="fa-solid fa-plus"></i> Update Progress
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers to Quick Update buttons
    container.querySelectorAll('.quick-update-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedOrderId = btn.dataset.order;
        selectedProduct = btn.dataset.product;
        selectedStage = btn.dataset.stage;
        selectedTarget = parseInt(btn.dataset.target, 10);
        selectedCompleted = parseInt(btn.dataset.completed, 10);

        if (quickModalOrder) quickModalOrder.value = `Order #${selectedOrderId.replace('ORD-', '')} — ${selectedProduct}`;
        if (quickModalStage) quickModalStage.value = selectedStage;
        if (quickModalQty) {
          quickModalQty.value = '';
          quickModalQty.focus();
        }
        if (quickModal) quickModal.classList.add('open');
      });
    });
  }

  // Quick Modal closing
  function closeQuick() {
    if (quickModal) quickModal.classList.remove('open');
  }

  if (closeQuickModal) closeQuickModal.addEventListener('click', closeQuick);
  if (quickModal) {
    quickModal.addEventListener('click', (e) => {
      if (e.target === quickModal) closeQuick();
    });
  }

  if (submitQuickUpdate) {
    submitQuickUpdate.addEventListener('click', () => {
      const qty = parseInt(quickModalQty.value, 10);
      if (isNaN(qty) || qty <= 0) {
        AGMS.toast('Please enter a valid positive quantity', 'error');
        quickModalQty.focus();
        return;
      }

      const rate = session.ratePerPiece || 15;
      const earned = qty * rate;

      AGMS.workerTasks.updateCompleted(session.id, selectedOrderId, qty);

      AGMS.workerHistory.add({
        workerId: session.id,
        date: new Date().toISOString().slice(0, 10),
        orderId: selectedOrderId,
        product: selectedProduct,
        stage: selectedStage,
        quantity: qty,
        earnings: earned,
        status: (selectedCompleted + qty >= selectedTarget) ? 'Completed' : 'In Progress'
      });

      closeQuick();
      AGMS.toast(`Production updated: +${qty} pieces recorded (+₹${earned.toLocaleString('en-IN')})`, 'success');
      renderTasks();
    });
  }

  renderTasks();
});
