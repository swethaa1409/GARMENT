/* ==========================================================================
   Payments Management logic
   ========================================================================== */

let paySearchTerm = '';
let payStatusFilter = '';

document.addEventListener('DOMContentLoaded', () => {
  AGMS.initPage();
  if (!AGMS.auth.requireSession()) return;
  AGMS.initSidebar();
  AGMS.initTopbar();

  populateWorkerSelect();
  renderPaymentStats();
  renderPayments();

  document.getElementById('paymentSearch').addEventListener('input', (e) => {
    paySearchTerm = e.target.value.trim().toLowerCase();
    renderPayments();
  });
  document.getElementById('paymentStatusFilter').addEventListener('change', (e) => {
    payStatusFilter = e.target.value;
    renderPayments();
  });

  document.getElementById('addPaymentBtn').addEventListener('click', () => openPaymentModal());
  document.getElementById('closePaymentModal').addEventListener('click', closePaymentModal);
  document.getElementById('cancelPaymentForm').addEventListener('click', closePaymentModal);
  document.getElementById('paymentModal').addEventListener('click', (e) => { if (e.target.id === 'paymentModal') closePaymentModal(); });
  document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);

  document.getElementById('paymentWorker').addEventListener('change', (e) => {
    const worker = AGMS.workers.get(e.target.value);
    if (worker) document.getElementById('paymentAmount').value = worker.salary;
  });
});

function populateWorkerSelect() {
  const select = document.getElementById('paymentWorker');
  const workers = AGMS.workers.all();
  select.innerHTML = workers.length
    ? workers.map(w => `<option value="${w.id}">${AGMS.escapeHtml(w.name)} — ${AGMS.escapeHtml(w.department)}</option>`).join('')
    : `<option value="">No workers available — add one first</option>`;
}

function renderPaymentStats() {
  const list = AGMS.payments.all();
  const total = list.reduce((s, p) => s + Number(p.amount), 0);
  const paid = list.filter(p => p.status === 'Paid').reduce((s, p) => s + Number(p.amount), 0);
  const pending = total - paid;

  document.getElementById('statTotalPayroll').textContent = AGMS.formatCurrency(total);
  document.getElementById('statPaid').textContent = AGMS.formatCurrency(paid);
  document.getElementById('statPending').textContent = AGMS.formatCurrency(pending);
  document.getElementById('statRecords').textContent = list.length;
}

function renderPayments() {
  let list = AGMS.payments.all();
  if (payStatusFilter) list = list.filter(p => p.status === payStatusFilter);
  if (paySearchTerm) list = list.filter(p => p.workerName.toLowerCase().includes(paySearchTerm));

  const body = document.getElementById('paymentsBody');
  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6"><i class="fa-solid fa-file-invoice-dollar"></i>No payment records found</td></tr>`;
    return;
  }

  body.innerHTML = list.map(p => `
    <tr>
      <td class="cell-id">${AGMS.escapeHtml(p.id)}</td>
      <td>${AGMS.escapeHtml(p.workerName)}</td>
      <td>${AGMS.formatCurrency(p.amount)}</td>
      <td><span class="badge ${p.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${AGMS.escapeHtml(p.status)}</span></td>
      <td class="cell-muted">${AGMS.formatDate(p.date)}</td>
      <td class="text-right">
        <button class="icon-action edit" title="Edit" onclick="editPayment('${p.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-action delete" title="Delete" onclick="deletePayment('${p.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openPaymentModal(payment) {
  populateWorkerSelect();
  const modal = document.getElementById('paymentModal');
  const title = document.getElementById('paymentModalTitle');
  const form = document.getElementById('paymentForm');
  form.reset();

  if (payment) {
    title.textContent = `Edit Payment — ${payment.id}`;
    document.getElementById('paymentEditId').value = payment.id;
    document.getElementById('paymentWorker').value = payment.workerId;
    document.getElementById('paymentAmount').value = payment.amount;
    document.getElementById('paymentStatus').value = payment.status;
    document.getElementById('paymentDate').value = payment.date;
  } else {
    title.textContent = 'Add Payment';
    document.getElementById('paymentEditId').value = '';
    document.getElementById('paymentDate').valueAsDate = new Date();
  }
  modal.classList.add('open');
}

function closePaymentModal() { document.getElementById('paymentModal').classList.remove('open'); }

function handlePaymentSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('paymentEditId').value;
  const workerId = document.getElementById('paymentWorker').value;
  const worker = AGMS.workers.get(workerId);

  if (!worker) {
    AGMS.toast('Please select a valid worker.', 'error');
    return;
  }

  const payload = {
    workerId,
    workerName: worker.name,
    amount: Number(document.getElementById('paymentAmount').value),
    status: document.getElementById('paymentStatus').value,
    date: document.getElementById('paymentDate').value
  };

  if (!payload.amount || !payload.date) {
    AGMS.toast('Please fill in all required fields.', 'error');
    return;
  }

  if (editId) {
    AGMS.payments.update(editId, payload);
    AGMS.toast('Payment record updated.', 'success');
  } else {
    AGMS.payments.add(payload);
    AGMS.toast('Payment record added.', 'success');
  }

  closePaymentModal();
  renderPaymentStats();
  renderPayments();
}

function editPayment(id) {
  const p = AGMS.payments.all().find(x => x.id === id);
  if (p) openPaymentModal(p);
}

function deletePayment(id) {
  if (!AGMS.confirmAction('Delete this payment record?')) return;
  AGMS.payments.remove(id);
  AGMS.toast('Payment record deleted.', 'info');
  renderPaymentStats();
  renderPayments();
}
