/* ==========================================================================
   Production Management logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  AGMS.initPage();
  if (!AGMS.auth.requireSession()) return;
  AGMS.initSidebar();
  AGMS.initTopbar();

  renderProductionStats();
  renderProductionTable();

  document.getElementById('addProductionBtn').addEventListener('click', () => openProductionModal());
  document.getElementById('closeProductionModal').addEventListener('click', closeProductionModal);
  document.getElementById('cancelProductionForm').addEventListener('click', closeProductionModal);
  document.getElementById('productionModal').addEventListener('click', (e) => { if (e.target.id === 'productionModal') closeProductionModal(); });
  document.getElementById('productionForm').addEventListener('submit', handleProductionSubmit);
});

function renderProductionStats() {
  const list = AGMS.production.all();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todays = list.filter(p => p.date === todayStr);

  const todayTarget = todays.reduce((s, p) => s + Number(p.target), 0);
  const todayCompleted = todays.reduce((s, p) => s + Number(p.completed), 0);

  const totalTarget = list.reduce((s, p) => s + Number(p.target), 0);
  const totalCompleted = list.reduce((s, p) => s + Number(p.completed), 0);
  const weeklyAvg = totalTarget ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  document.getElementById('statTarget').textContent = todayTarget || '—';
  document.getElementById('statCompletedToday').textContent = todayCompleted || '—';
  document.getElementById('statWeeklyAvg').textContent = weeklyAvg + '%';
  document.getElementById('statEntries').textContent = list.length;
}

function renderProductionTable() {
  const list = AGMS.production.all().sort((a, b) => new Date(b.date) - new Date(a.date));
  const body = document.getElementById('productionBody');

  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6"><i class="fa-solid fa-industry"></i>No production entries logged yet</td></tr>`;
    return;
  }

  body.innerHTML = list.map(p => {
    const pct = p.target > 0 ? Math.min(100, Math.round((p.completed / p.target) * 100)) : 0;
    const fillClass = pct < 60 ? 'behind' : pct < 90 ? 'close' : '';
    return `
    <tr>
      <td class="cell-muted">${AGMS.formatDate(p.date)}</td>
      <td><span class="dept-tag" style="display:inline-block;padding:4px 11px;border-radius:30px;background:rgba(74,95,217,0.1);color:var(--indigo-600);font-size:11.5px;font-weight:600;">${AGMS.escapeHtml(p.department)}</span></td>
      <td>${AGMS.escapeHtml(p.target)}</td>
      <td>${AGMS.escapeHtml(p.completed)}</td>
      <td>
        <div class="progress-cell">
          <div class="progress-track"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div>
          <span class="progress-pct">${pct}%</span>
        </div>
      </td>
      <td class="text-right">
        <button class="icon-action edit" title="Edit" onclick="editProduction('${p.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-action delete" title="Delete" onclick="deleteProduction('${p.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function openProductionModal(entry) {
  const modal = document.getElementById('productionModal');
  const title = document.getElementById('productionModalTitle');
  const form = document.getElementById('productionForm');
  form.reset();

  if (entry) {
    title.textContent = 'Edit Production Entry';
    document.getElementById('productionEditId').value = entry.id;
    document.getElementById('productionDate').value = entry.date;
    document.getElementById('productionDept').value = entry.department;
    document.getElementById('productionTarget').value = entry.target;
    document.getElementById('productionCompleted').value = entry.completed;
  } else {
    title.textContent = 'Log Production';
    document.getElementById('productionEditId').value = '';
    document.getElementById('productionDate').valueAsDate = new Date();
  }
  modal.classList.add('open');
}

function closeProductionModal() { document.getElementById('productionModal').classList.remove('open'); }

function handleProductionSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('productionEditId').value;
  const payload = {
    date: document.getElementById('productionDate').value,
    department: document.getElementById('productionDept').value,
    target: Number(document.getElementById('productionTarget').value),
    completed: Number(document.getElementById('productionCompleted').value)
  };

  if (!payload.date || !payload.target) {
    AGMS.toast('Please fill in all required fields.', 'error');
    return;
  }
  if (payload.completed > payload.target) {
    AGMS.toast('Completed units cannot exceed the target.', 'error');
    return;
  }

  if (editId) {
    AGMS.production.update(editId, payload);
    AGMS.toast('Production entry updated.', 'success');
  } else {
    AGMS.production.add(payload);
    AGMS.toast('Production entry logged.', 'success');
  }

  closeProductionModal();
  renderProductionStats();
  renderProductionTable();
}

function editProduction(id) {
  const entry = AGMS.production.all().find(p => p.id === id);
  if (entry) openProductionModal(entry);
}

function deleteProduction(id) {
  if (!AGMS.confirmAction('Delete this production entry?')) return;
  AGMS.production.remove(id);
  AGMS.toast('Production entry deleted.', 'info');
  renderProductionStats();
  renderProductionTable();
}
