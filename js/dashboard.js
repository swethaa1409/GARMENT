/* ==========================================================================
   Dashboard logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  AGMS.initPage();
  if (!AGMS.auth.requireSession()) return;

  AGMS.initSidebar();
  AGMS.initTopbar();

  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  renderStats();
  renderRecentOrders();
  renderAiAlerts();
});

function renderStats() {
  const orders = AGMS.orders.all();
  const workers = AGMS.workers.all();
  const completed = orders.filter(o => o.status === 'Completed');

  // Revenue estimate: ₹350 per garment unit for completed orders (illustrative)
  const revenue = completed.reduce((sum, o) => sum + (Number(o.quantity) || 0) * 350, 0);

  document.getElementById('statOrders').textContent = orders.length;
  document.getElementById('statWorkers').textContent = workers.length;
  document.getElementById('statCompleted').textContent = completed.length;
  document.getElementById('statRevenue').textContent = AGMS.formatCurrency(revenue);
}

function statusBadge(status) {
  const map = {
    'Pending': 'badge-pending',
    'In Progress': 'badge-progress',
    'Completed': 'badge-completed'
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${AGMS.escapeHtml(status)}</span>`;
}

function renderRecentOrders() {
  const orders = AGMS.orders.all().slice(0, 6);
  const body = document.getElementById('recentOrdersBody');

  if (!orders.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="5"><i class="fa-solid fa-inbox"></i>No orders yet</td></tr>`;
    return;
  }

  body.innerHTML = orders.map(o => `
    <tr>
      <td class="cell-id">${AGMS.escapeHtml(o.id)}</td>
      <td>${AGMS.escapeHtml(o.product)}</td>
      <td>${AGMS.escapeHtml(o.quantity)}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="cell-muted">${AGMS.formatDate(o.deliveryDate)}</td>
    </tr>
  `).join('');
}

function renderAiAlerts() {
  const orders = AGMS.orders.all();
  const production = AGMS.production.all();
  const workers = AGMS.workers.all();
  const payments = AGMS.payments.all();
  const alerts = [];
  const today = new Date(); today.setHours(0,0,0,0);

  // Overdue orders
  orders.forEach(o => {
    if (o.status === 'Completed') return;
    const due = new Date(o.deliveryDate);
    const diffDays = Math.ceil((due - today) / 86400000);
    if (diffDays < 0) {
      alerts.push({
        level: 'danger', icon: 'fa-triangle-exclamation',
        title: `Order ${o.id} is overdue`,
        text: `${o.product} was due ${AGMS.formatDate(o.deliveryDate)} and is still "${o.status}".`
      });
    } else if (diffDays <= 2) {
      alerts.push({
        level: 'warn', icon: 'fa-clock',
        title: `Order ${o.id} due soon`,
        text: `${o.product} is due in ${diffDays === 0 ? 'today' : diffDays + ' day(s)'} — currently "${o.status}".`
      });
    }
  });

  // Production shortfall
  production.slice(0, 3).forEach(p => {
    if (p.completed < p.target * 0.75) {
      alerts.push({
        level: 'warn', icon: 'fa-gauge-high',
        title: `${p.department} output below target`,
        text: `Completed ${p.completed}/${p.target} units on ${AGMS.formatDate(p.date)}.`
      });
    }
  });

  // Pending payments
  const pendingPay = payments.filter(p => p.status === 'Pending');
  if (pendingPay.length) {
    alerts.push({
      level: 'info', icon: 'fa-money-bill-wave',
      title: `${pendingPay.length} salary payment(s) pending`,
      text: `Review and clear pending payments for ${pendingPay.map(p => p.workerName).slice(0,3).join(', ')}.`
    });
  }

  // Worker capacity insight
  const activeOrderQty = orders.filter(o => o.status !== 'Completed').reduce((s, o) => s + Number(o.quantity || 0), 0);
  if (workers.length && activeOrderQty / workers.length > 150) {
    alerts.push({
      level: 'info', icon: 'fa-user-clock',
      title: 'Workforce may be stretched thin',
      text: `${activeOrderQty} units are active across only ${workers.length} workers. Consider reallocating staff.`
    });
  }

  if (!alerts.length) {
    alerts.push({
      level: 'info', icon: 'fa-circle-check',
      title: 'All clear',
      text: 'No urgent issues detected across orders, production or payments.'
    });
  }

  document.getElementById('alertCount').textContent = `${alerts.length} active`;
  document.getElementById('aiAlertsHost').innerHTML = alerts.slice(0, 6).map(a => `
    <div class="ai-alert ${a.level === 'danger' ? 'danger' : a.level === 'warn' ? 'warn' : ''}">
      <div class="ai-icon"><i class="fa-solid ${a.icon}"></i></div>
      <div>
        <strong>${AGMS.escapeHtml(a.title)}</strong>
        <p>${AGMS.escapeHtml(a.text)}</p>
      </div>
    </div>
  `).join('');
}
