/* ==========================================================================
   Orders Management logic
   ========================================================================== */

let currentSearch = '';
let currentStatusFilter = '';

document.addEventListener('DOMContentLoaded', () => {
  AGMS.initPage();
  if (!AGMS.auth.requireSession()) return;
  AGMS.initSidebar();
  AGMS.initTopbar();

  renderOrders();

  document.getElementById('orderSearch').addEventListener('input', (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    renderOrders();
  });
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    renderOrders();
  });

  document.getElementById('addOrderBtn').addEventListener('click', () => openOrderModal());
  document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
  document.getElementById('cancelOrderForm').addEventListener('click', closeOrderModal);
  document.getElementById('orderModal').addEventListener('click', (e) => { if (e.target.id === 'orderModal') closeOrderModal(); });

  document.getElementById('closeViewOrderModal').addEventListener('click', closeViewModal);
  document.getElementById('viewOrderModal').addEventListener('click', (e) => { if (e.target.id === 'viewOrderModal') closeViewModal(); });

  document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);
});

function statusBadge(status) {
  const map = { 'Pending': 'badge-pending', 'In Progress': 'badge-progress', 'Completed': 'badge-completed' };
  return `<span class="badge ${map[status] || 'badge-pending'}">${AGMS.escapeHtml(status)}</span>`;
}

function renderOrders() {
  let list = AGMS.orders.all();

  if (currentStatusFilter) list = list.filter(o => o.status === currentStatusFilter);
  if (currentSearch) {
    list = list.filter(o =>
      o.id.toLowerCase().includes(currentSearch) ||
      o.product.toLowerCase().includes(currentSearch) ||
      o.status.toLowerCase().includes(currentSearch)
    );
  }

  const body = document.getElementById('ordersBody');
  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="7"><i class="fa-solid fa-box-open"></i>No orders found</td></tr>`;
    return;
  }

  body.innerHTML = list.map(o => `
    <tr>
      <td class="cell-id">${AGMS.escapeHtml(o.id)}</td>
      <td>${AGMS.escapeHtml(o.product)}</td>
      <td>${AGMS.escapeHtml(o.quantity)}</td>
      <td>${statusBadge(o.status)}</td>
      <td class="cell-muted">${AGMS.formatDate(o.deliveryDate)}</td>
      <td class="cell-muted">${AGMS.formatDate(o.createdAt)}</td>
      <td class="text-right">
        <button class="icon-action view" title="View" onclick="viewOrder('${o.id}')"><i class="fa-solid fa-eye"></i></button>
        <button class="icon-action edit" title="Edit" onclick="editOrder('${o.id}')"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-action delete" title="Delete" onclick="deleteOrder('${o.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openOrderModal(order) {
  const modal = document.getElementById('orderModal');
  const title = document.getElementById('orderModalTitle');
  const form = document.getElementById('orderForm');
  form.reset();

  if (order) {
    title.textContent = `Edit Order — ${order.id}`;
    document.getElementById('orderEditId').value = order.id;
    document.getElementById('orderProduct').value = order.product;
    document.getElementById('orderQty').value = order.quantity;
    document.getElementById('orderStatus').value = order.status;
    document.getElementById('orderDelivery').value = order.deliveryDate;
  } else {
    title.textContent = 'Add New Order';
    document.getElementById('orderEditId').value = '';
    document.getElementById('orderDelivery').valueAsDate = new Date(Date.now() + 7 * 86400000);
  }
  modal.classList.add('open');
}

function closeOrderModal() { document.getElementById('orderModal').classList.remove('open'); }
function closeViewModal() { document.getElementById('viewOrderModal').classList.remove('open'); }

function handleOrderSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('orderEditId').value;
  const payload = {
    product: document.getElementById('orderProduct').value.trim(),
    quantity: Number(document.getElementById('orderQty').value),
    status: document.getElementById('orderStatus').value,
    deliveryDate: document.getElementById('orderDelivery').value
  };

  if (!payload.product || !payload.quantity || !payload.deliveryDate) {
    AGMS.toast('Please fill in all required fields.', 'error');
    return;
  }

  if (editId) {
    AGMS.orders.update(editId, payload);
    AGMS.toast(`Order ${editId} updated successfully.`, 'success');
  } else {
    AGMS.orders.add(payload);
    AGMS.toast('New order created successfully.', 'success');
  }

  closeOrderModal();
  renderOrders();
}

function viewOrder(id) {
  const o = AGMS.orders.get(id);
  if (!o) return;
  document.getElementById('orderViewBody').innerHTML = `
    <div class="detail-row"><span>Order ID</span><span>${AGMS.escapeHtml(o.id)}</span></div>
    <div class="detail-row"><span>Product</span><span>${AGMS.escapeHtml(o.product)}</span></div>
    <div class="detail-row"><span>Quantity</span><span>${AGMS.escapeHtml(o.quantity)}</span></div>
    <div class="detail-row"><span>Status</span><span>${statusBadge(o.status)}</span></div>
    <div class="detail-row"><span>Delivery Date</span><span>${AGMS.formatDate(o.deliveryDate)}</span></div>
    <div class="detail-row"><span>Created On</span><span>${AGMS.formatDate(o.createdAt)}</span></div>
  `;
  document.getElementById('viewOrderModal').classList.add('open');
}

function editOrder(id) {
  const o = AGMS.orders.get(id);
  if (o) openOrderModal(o);
}

function deleteOrder(id) {
  if (!AGMS.confirmAction(`Delete order ${id}? This cannot be undone.`)) return;
  AGMS.orders.remove(id);
  AGMS.toast(`Order ${id} deleted.`, 'info');
  renderOrders();
}
