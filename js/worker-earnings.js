/**
 * AI Garment Management System — Worker Earnings Controller
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

  function renderEarnings() {
    const rate = session.ratePerPiece || 15;
    const tasks = AGMS.workerTasks.forWorker(session.id);
    const todayTask = AGMS.workerTasks.todayTask(session.id) || tasks[0];
    const history = AGMS.workerHistory.forWorker(session.id);

    const todayStr = new Date().toISOString().slice(0, 10);

    // Calculate today's earnings from history or active task
    const todayHistory = history.filter(h => h.date === todayStr);
    let todayEarned = todayHistory.reduce((sum, h) => sum + (Number(h.earnings) || 0), 0);
    if (todayEarned === 0 && todayTask) {
      todayEarned = (todayTask.completed || 0) * rate;
    }

    // Weekly and Monthly baselines + today's addition
    const baseWeek = 8450;
    const baseMonth = 31200;
    const basePending = 4500;

    const earnToday = document.getElementById('earnToday');
    const earnWeek = document.getElementById('earnWeek');
    const earnMonth = document.getElementById('earnMonth');
    const earnPending = document.getElementById('earnPending');

    if (earnToday) earnToday.textContent = `₹${todayEarned.toLocaleString('en-IN')}`;
    if (earnWeek) earnWeek.textContent = `₹${(baseWeek + (todayEarned - 1680)).toLocaleString('en-IN')}`;
    if (earnMonth) earnMonth.textContent = `₹${(baseMonth + (todayEarned - 1680)).toLocaleString('en-IN')}`;
    if (earnPending) earnPending.textContent = `₹${(basePending + (todayEarned - 1680)).toLocaleString('en-IN')}`;

    // Current Order Payment Details
    const earnCurOrder = document.getElementById('earnCurOrder');
    const earnCurCalc = document.getElementById('earnCurCalc');

    if (todayTask) {
      const orderClean = todayTask.orderId.replace('ORD-', '');
      if (earnCurOrder) {
        earnCurOrder.textContent = `Order #${orderClean} — ${todayTask.product}`;
      }
      if (earnCurCalc) {
        const completed = todayTask.completed || 0;
        const total = completed * rate;
        earnCurCalc.innerHTML = `${completed} pieces × ₹${rate} = <strong style="color:var(--amber-500);font-size:15px;">₹${total.toLocaleString('en-IN')}</strong>`;
      }
    }

    // Payment History Table
    const tbody = document.getElementById('paymentHistoryBody');
    if (!tbody) return;

    if (!history || history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:24px;">No payment records found.</td></tr>';
      return;
    }

    tbody.innerHTML = history.map(item => {
      const isToday = item.date === todayStr;
      const orderClean = item.orderId ? item.orderId.replace('ORD-', '') : '—';
      const statusBadge = isToday
        ? '<span class="status-badge status-badge--attention" style="padding:2px 8px;font-size:11px;">Pending</span>'
        : '<span class="status-badge status-badge--done" style="padding:2px 8px;font-size:11px;">Paid</span>';

      return `
        <tr>
          <td><strong>${AGMS.formatDate(item.date)}</strong></td>
          <td><strong>#${AGMS.escapeHtml(orderClean)}</strong></td>
          <td>${AGMS.escapeHtml(item.product || 'Shirt')}</td>
          <td><strong>${item.quantity}</strong> pcs</td>
          <td style="color:var(--text-secondary);">₹${rate}/pc</td>
          <td style="color:var(--amber-500);font-weight:700;">₹${Number(item.earnings || 0).toLocaleString('en-IN')}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  renderEarnings();
});
