/* ==========================================================================
   AI Analytics logic — Chart.js visualizations
   ========================================================================== */

const CHART_COLORS = {
  indigo: '#4A5FD9', indigoSoft: 'rgba(74,95,217,0.15)',
  amber: '#E8A33D', amberSoft: 'rgba(232,163,61,0.15)',
  green: '#2FBF71', greenSoft: 'rgba(47,191,113,0.15)',
  red: '#EF5A5A', redSoft: 'rgba(239,90,90,0.15)',
  grid: 'rgba(98,106,128,0.12)'
};

document.addEventListener('DOMContentLoaded', () => {
  AGMS.initPage();
  if (!AGMS.auth.requireSession()) return;
  AGMS.initSidebar();
  AGMS.initTopbar();

  Chart.defaults.font.family = "'Poppins', sans-serif";
  Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#626A80';

  buildRevenueChart();
  buildProductionChart();
  buildWorkerChart();
  buildOrderStatusChart();
  buildAiSummary();
});

function buildRevenueChart() {
  const orders = AGMS.orders.all();
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), key: `${d.getFullYear()}-${d.getMonth()}` });
  }

  const revenueByMonth = months.map(m => 0);
  orders.filter(o => o.status === 'Completed').forEach(o => {
    const d = new Date(o.createdAt || o.deliveryDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = months.findIndex(m => m.key === key);
    if (idx >= 0) revenueByMonth[idx] += (Number(o.quantity) || 0) * 350;
    else revenueByMonth[months.length - 1] += (Number(o.quantity) || 0) * 350 * 0.3; // fold distant orders lightly into latest month
  });

  new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'Revenue (₹)',
        data: revenueByMonth,
        borderColor: CHART_COLORS.indigo,
        backgroundColor: CHART_COLORS.indigoSoft,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: CHART_COLORS.indigo,
        pointRadius: 4,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => AGMS.formatCurrency(ctx.parsed.y) } }
      },
      scales: {
        y: { grid: { color: CHART_COLORS.grid }, ticks: { callback: (v) => '₹' + (v / 1000) + 'k' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function buildProductionChart() {
  const production = AGMS.production.all().slice(0, 7).reverse();
  new Chart(document.getElementById('productionChart'), {
    type: 'bar',
    data: {
      labels: production.map(p => AGMS.formatDate(p.date)),
      datasets: [
        { label: 'Target', data: production.map(p => p.target), backgroundColor: CHART_COLORS.amberSoft, borderColor: CHART_COLORS.amber, borderWidth: 2, borderRadius: 6 },
        { label: 'Completed', data: production.map(p => p.completed), backgroundColor: CHART_COLORS.indigoSoft, borderColor: CHART_COLORS.indigo, borderWidth: 2, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1400, easing: 'easeOutQuart' },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
      scales: { y: { grid: { color: CHART_COLORS.grid }, beginAtZero: true }, x: { grid: { display: false } } }
    }
  });
}

function buildWorkerChart() {
  const workers = AGMS.workers.all();
  const production = AGMS.production.all();
  const deptTotals = {};

  workers.forEach(w => { deptTotals[w.department] = deptTotals[w.department] || 0; });
  production.forEach(p => { deptTotals[p.department] = (deptTotals[p.department] || 0) + Number(p.completed); });

  const labels = Object.keys(deptTotals).filter(k => deptTotals[k] > 0);
  const data = labels.map(l => deptTotals[l]);
  const palette = [CHART_COLORS.indigo, CHART_COLORS.amber, CHART_COLORS.green, CHART_COLORS.red, '#8A98F0', '#D96C6C'];

  new Chart(document.getElementById('workerChart'), {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No data yet'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: labels.length ? palette.slice(0, labels.length) : ['#E5E7EF'],
        borderWidth: 3,
        borderColor: '#fff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      animation: { duration: 1200, animateRotate: true, animateScale: true },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } }
    }
  });
}

function buildOrderStatusChart() {
  const orders = AGMS.orders.all();
  const statuses = ['Pending', 'In Progress', 'Completed'];
  const counts = statuses.map(s => orders.filter(o => o.status === s).length);

  new Chart(document.getElementById('orderStatusChart'), {
    type: 'pie',
    data: {
      labels: statuses,
      datasets: [{
        data: counts,
        backgroundColor: [CHART_COLORS.amber, CHART_COLORS.indigo, CHART_COLORS.green],
        borderWidth: 3,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1200, animateRotate: true },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } }
    }
  });
}

function buildAiSummary() {
  const orders = AGMS.orders.all();
  const production = AGMS.production.all();
  const payments = AGMS.payments.all();

  const completed = orders.filter(o => o.status === 'Completed').length;
  const completionRate = orders.length ? Math.round((completed / orders.length) * 100) : 0;

  const totalTarget = production.reduce((s, p) => s + Number(p.target), 0);
  const totalCompleted = production.reduce((s, p) => s + Number(p.completed), 0);
  const efficiency = totalTarget ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  const pendingPay = payments.filter(p => p.status === 'Pending').length;

  const text = `Order completion rate stands at ${completionRate}% with production efficiency at ${efficiency}% of target output. `
    + (pendingPay > 0 ? `${pendingPay} salary payment(s) still need to be cleared. ` : 'All salary payments are up to date. ')
    + (efficiency < 80 ? 'Consider redistributing workers to underperforming departments to close the output gap.' : 'Production is tracking well against targets — maintain current staffing levels.');

  document.getElementById('aiSummaryText').textContent = text;
}
