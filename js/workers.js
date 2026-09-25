/* ==========================================================================
   Workers Management logic
   ========================================================================== */

let workerSearchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
  AGMS.initPage();
  if (!AGMS.auth.requireSession()) return;
  AGMS.initSidebar();
  AGMS.initTopbar();

  renderWorkers();

  document.getElementById('workerSearch').addEventListener('input', (e) => {
    workerSearchTerm = e.target.value.trim().toLowerCase();
    renderWorkers();
  });

  document.getElementById('addWorkerBtn').addEventListener('click', () => openWorkerModal());
  document.getElementById('closeWorkerModal').addEventListener('click', closeWorkerModal);
  document.getElementById('cancelWorkerForm').addEventListener('click', closeWorkerModal);
  document.getElementById('workerModal').addEventListener('click', (e) => { if (e.target.id === 'workerModal') closeWorkerModal(); });
  document.getElementById('workerForm').addEventListener('submit', handleWorkerSubmit);
});

function initials(name) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function renderWorkers() {
  let list = AGMS.workers.all();
  if (workerSearchTerm) {
    list = list.filter(w =>
      w.name.toLowerCase().includes(workerSearchTerm) ||
      w.department.toLowerCase().includes(workerSearchTerm) ||
      w.phone.includes(workerSearchTerm)
    );
  }

  const body = document.getElementById('workersBody');
  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="7"><i class="fa-solid fa-user-slash"></i>No workers found</td></tr>`;
    return;
  }

  body.innerHTML = list.map(w => `
    <tr>
      <td class="cell-id">${AGMS.escapeHtml(w.id)}</td>
      <td>
        <div class="worker-name-cell">
          <div class="worker-avatar">${initials(w.name)}</div>
          <span>${AGMS.escapeHtml(w.name)}</span>
        </div>
      </td>
      <td><span class="dept-tag">${AGMS.escapeHtml(w.department)}</span></td>
      <td>${AGMS.formatCurrency(w.salary)}</td>
      <td class="cell-muted">${AGMS.escapeHtml(w.phone)}</td>
      <td class="cell-muted">${AGMS.formatDate(w.joined)}</td>
      <td class="text-right">
        <button class="icon-action edit" title="Edit" onclick="editWorker('${w.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-action delete" title="Delete" onclick="deleteWorker('${w.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openWorkerModal(worker) {
  const modal = document.getElementById('workerModal');
  const title = document.getElementById('workerModalTitle');
  const form = document.getElementById('workerForm');
  form.reset();

  if (worker) {
    title.textContent = `Edit Worker — ${worker.name}`;
    document.getElementById('workerEditId').value = worker.id;
    document.getElementById('workerName').value = worker.name;
    document.getElementById('workerDept').value = worker.department;
    document.getElementById('workerSalary').value = worker.salary;
    document.getElementById('workerPhone').value = worker.phone;
  } else {
    title.textContent = 'Add New Worker';
    document.getElementById('workerEditId').value = '';
  }
  modal.classList.add('open');
}

function closeWorkerModal() { document.getElementById('workerModal').classList.remove('open'); }

function handleWorkerSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('workerEditId').value;
  const phone = document.getElementById('workerPhone').value.trim();

  if (!/^\d{10}$/.test(phone)) {
    AGMS.toast('Phone number must be exactly 10 digits.', 'error');
    return;
  }

  const payload = {
    name: document.getElementById('workerName').value.trim(),
    department: document.getElementById('workerDept').value,
    salary: Number(document.getElementById('workerSalary').value),
    phone
  };

  if (!payload.name || !payload.salary) {
    AGMS.toast('Please fill in all required fields.', 'error');
    return;
  }

  if (editId) {
    AGMS.workers.update(editId, payload);
    AGMS.toast(`Worker ${payload.name} updated successfully.`, 'success');
  } else {
    AGMS.workers.add(payload);
    AGMS.toast(`Worker ${payload.name} added successfully.`, 'success');
  }

  closeWorkerModal();
  renderWorkers();
}

function editWorker(id) {
  const w = AGMS.workers.get(id);
  if (w) openWorkerModal(w);
}

function deleteWorker(id) {
  const w = AGMS.workers.get(id);
  if (!w) return;
  if (!AGMS.confirmAction(`Remove ${w.name} from the workforce?`)) return;
  AGMS.workers.remove(id);
  AGMS.toast(`Worker ${w.name} removed.`, 'info');
  renderWorkers();
}
