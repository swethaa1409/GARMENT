/**
 * AI Garment Management System — Worker History Controller
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

  const histSearch = document.getElementById('histSearch');
  const histStageFilter = document.getElementById('histStageFilter');
  const histStatusFilter = document.getElementById('histStatusFilter');
  const fullHistoryBody = document.getElementById('fullHistoryBody');

  const histStatEntries = document.getElementById('histStatEntries');
  const histStatPieces = document.getElementById('histStatPieces');
  const histStatEarnings = document.getElementById('histStatEarnings');

  function renderHistory() {
    const allHistory = AGMS.workerHistory.forWorker(session.id);

    // Compute aggregate metrics
    const totalEntries = allHistory.length;
    const totalPieces = allHistory.reduce((s, h) => s + (Number(h.quantity) || 0), 0);
    const totalEarnings = allHistory.reduce((s, h) => s + (Number(h.earnings) || 0), 0);

    if (histStatEntries) histStatEntries.textContent = totalEntries;
    if (histStatPieces) histStatPieces.textContent = totalPieces.toLocaleString('en-IN');
    if (histStatEarnings) histStatEarnings.textContent = `₹${totalEarnings.toLocaleString('en-IN')}`;

    if (!fullHistoryBody) return;

    // Filter
    const query = (histSearch ? histSearch.value : '').toLowerCase().trim();
    const stage = histStageFilter ? histStageFilter.value : 'all';
    const status = histStatusFilter ? histStatusFilter.value : 'all';

    const filtered = allHistory.filter(item => {
      const matchQuery = !query ||
        (item.orderId && item.orderId.toLowerCase().includes(query)) ||
        (item.product && item.product.toLowerCase().includes(query));

      const matchStage = stage === 'all' || item.stage === stage;
      const matchStatus = status === 'all' || item.status === status;

      return matchQuery && matchStage && matchStatus;
    });

    if (filtered.length === 0) {
      fullHistoryBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:30px;">No matching production records found.</td></tr>';
      return;
    }

    fullHistoryBody.innerHTML = filtered.map(item => {
      const orderClean = item.orderId ? item.orderId.replace('ORD-', '') : '—';
      const statusBadge = item.status === 'Completed'
        ? '<span class="status-badge status-badge--done" style="padding:2px 8px;font-size:11px;">Completed</span>'
        : '<span class="status-badge status-badge--on-track" style="padding:2px 8px;font-size:11px;">In Progress</span>';

      return `
        <tr>
          <td><strong>${AGMS.formatDate(item.date)}</strong></td>
          <td><strong>#${AGMS.escapeHtml(orderClean)}</strong></td>
          <td>${AGMS.escapeHtml(item.product || '—')}</td>
          <td><span style="background:rgba(74,95,217,0.08);color:var(--indigo-600);padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">${AGMS.escapeHtml(item.stage || '—')}</span></td>
          <td><strong>${item.quantity}</strong> pcs</td>
          <td style="color:var(--amber-500);font-weight:700;">₹${Number(item.earnings || 0).toLocaleString('en-IN')}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  if (histSearch) histSearch.addEventListener('input', renderHistory);
  if (histStageFilter) histStageFilter.addEventListener('change', renderHistory);
  if (histStatusFilter) histStatusFilter.addEventListener('change', renderHistory);

  renderHistory();
});
