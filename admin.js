/**
 * Maison Élara — Admin Dashboard Script
 * Handles: authentication, menu CRUD, orders, reservations, reviews, stats
 */

const API = '';
let authToken = sessionStorage.getItem('adminToken') || '';
let currentSection = 'dashboard';

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (authToken) {
    showAdmin();
  } else {
    showLogin();
  }

  initLogin();
  initSidebar();
  initMenuForm();
  initLogout();
});

// ── Auth ──────────────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminLayout').style.display = 'none';
}

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminLayout').style.display = 'flex';
  loadSection('dashboard');
}

function initLogin() {
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');
    errEl.style.display = 'none';

    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        authToken = data.token;
        sessionStorage.setItem('adminToken', authToken);
        showAdmin();
      } else {
        errEl.style.display = 'block';
      }
    } catch {
      errEl.style.display = 'block';
      errEl.textContent = 'Server error. Is the server running?';
    }
  });
}

function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await fetch(`${API}/api/admin/logout`, {
        method: 'POST',
        headers: { Authorization: authToken }
      });
    } catch {}
    authToken = '';
    sessionStorage.removeItem('adminToken');
    showLogin();
  });
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function initSidebar() {
  document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      loadSection(section);
    });
  });
}

function loadSection(section) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${section}`).classList.add('active');
  currentSection = section;

  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'menu': loadMenuItems(); break;
    case 'orders': loadOrders(); break;
    case 'reservations': loadReservations(); break;
    case 'reviews': loadReviewsAdmin(); break;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [statsRes, ordersRes] = await Promise.all([
      fetch(`${API}/api/stats`, { headers: { Authorization: authToken } }),
      fetch(`${API}/api/orders`, { headers: { Authorization: authToken } })
    ]);
    const stats = await statsRes.json();
    const orders = await ordersRes.json();

    const grid = document.getElementById('statsGrid');
    const labels = [
      ['Total Orders', stats.totalOrders, '📋'],
      [`€${parseFloat(stats.totalRevenue).toLocaleString()}`, 'Total Revenue', '💰'],
      [stats.reservationsToday, 'Today\'s Reservations', '📅'],
      [stats.pendingOrders, 'Pending Orders', '⏳'],
      [stats.menuItems, 'Menu Items', '🍽️'],
      [stats.totalReviews, 'Reviews', '⭐']
    ];

    grid.innerHTML = `
      <div class="stat-card"><div class="stat-num">${stats.totalOrders}</div><div class="stat-label">Total Orders</div></div>
      <div class="stat-card"><div class="stat-num">€${parseFloat(stats.totalRevenue).toLocaleString('en',{minimumFractionDigits:2})}</div><div class="stat-label">Total Revenue</div></div>
      <div class="stat-card"><div class="stat-num">${stats.reservationsToday}</div><div class="stat-label">Today's Reservations</div></div>
      <div class="stat-card"><div class="stat-num">${stats.pendingOrders}</div><div class="stat-label">Pending Orders</div></div>
      <div class="stat-card"><div class="stat-num">${stats.menuItems}</div><div class="stat-label">Menu Items</div></div>
      <div class="stat-card"><div class="stat-num">${stats.totalReviews}</div><div class="stat-label">Reviews</div></div>
    `;

    const recent = [...orders].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const tbody = document.querySelector('#dashOrdersTable tbody');
    tbody.innerHTML = recent.length ? recent.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customerName}</td>
        <td>€${o.total.toFixed(2)}</td>
        <td><span class="status-badge status-${o.status}">${o.status}</span></td>
        <td>${new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--grey)">No orders yet</td></tr>';

  } catch (err) {
    showToast('Failed to load dashboard data', 'error');
    if (err.message.includes('401')) { authToken = ''; showLogin(); }
  }
}

// ── Menu CRUD ─────────────────────────────────────────────────────────────────
async function loadMenuItems() {
  try {
    const res = await fetch(`${API}/api/menu`);
    const items = await res.json();
    const tbody = document.querySelector('#menuTable tbody');
    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <img src="${item.image}" alt="" style="width:42px;height:42px;object-fit:cover;border-radius:2px;" onerror="this.style.display='none'">
            <span>${item.name}</span>
          </div>
        </td>
        <td><span class="status-badge status-confirmed">${item.category}</span></td>
        <td>€${item.price.toFixed(2)}</td>
        <td>
          <div style="display:flex;gap:0.5rem">
            <button class="action-btn action-edit" onclick="editMenuItem(${item.id})">Edit</button>
            <button class="action-btn action-delete" onclick="deleteMenuItem(${item.id},'${item.name.replace(/'/g,"\\'")}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch {
    showToast('Failed to load menu items', 'error');
  }
}

function initMenuForm() {
  const toggleBtn = document.getElementById('toggleAddItem');
  const addForm = document.getElementById('addItemForm');
  const cancelBtn = document.getElementById('cancelItemBtn');
  const form = document.getElementById('menuItemForm');

  toggleBtn.addEventListener('click', () => {
    addForm.classList.toggle('open');
    document.getElementById('editItemId').value = '';
    document.getElementById('formTitle').textContent = 'Add New Item';
    document.getElementById('saveItemBtn').textContent = 'Save Item';
    form.reset();
  });

  cancelBtn.addEventListener('click', () => {
    addForm.classList.remove('open');
    form.reset();
    document.getElementById('editItemId').value = '';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const editId = document.getElementById('editItemId').value;
    const data = {
      name: document.getElementById('itemName').value.trim(),
      category: document.getElementById('itemCategory').value,
      price: parseFloat(document.getElementById('itemPrice').value),
      description: document.getElementById('itemDesc').value.trim(),
      image: document.getElementById('itemImage').value.trim() || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'
    };

    if (!data.name || !data.category || !data.price || !data.description) {
      showToast('Please fill in all required fields', 'error'); return;
    }

    try {
      const url = editId ? `${API}/api/menu/${editId}` : `${API}/api/menu`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: authToken },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      showToast(editId ? 'Menu item updated!' : 'New item added to menu!', 'success');
      addForm.classList.remove('open');
      form.reset();
      document.getElementById('editItemId').value = '';
      loadMenuItems();
    } catch {
      showToast('Failed to save menu item', 'error');
    }
  });
}

async function editMenuItem(id) {
  try {
    const res = await fetch(`${API}/api/menu`);
    const items = await res.json();
    const item = items.find(i => i.id === id);
    if (!item) return;

    const addForm = document.getElementById('addItemForm');
    addForm.classList.add('open');
    document.getElementById('editItemId').value = id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemDesc').value = item.description;
    document.getElementById('itemImage').value = item.image;
    document.getElementById('formTitle').textContent = 'Edit Item';
    document.getElementById('saveItemBtn').textContent = 'Update Item';
    addForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    showToast('Failed to load item for editing', 'error');
  }
}

async function deleteMenuItem(id, name) {
  if (!confirm(`Delete "${name}" from the menu?`)) return;
  try {
    const res = await fetch(`${API}/api/menu/${id}`, {
      method: 'DELETE',
      headers: { Authorization: authToken }
    });
    if (!res.ok) throw new Error();
    showToast(`"${name}" removed from menu`, 'success');
    loadMenuItems();
  } catch {
    showToast('Failed to delete item', 'error');
  }
}

// ── Orders ────────────────────────────────────────────────────────────────────
async function loadOrders() {
  try {
    const res = await fetch(`${API}/api/orders`, { headers: { Authorization: authToken } });
    const orders = await res.json();
    const sorted = [...orders].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = sorted.length ? sorted.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>
          <div>${o.customerName}</div>
          <div style="font-size:0.78rem;color:var(--grey)">${o.customerEmail}</div>
        </td>
        <td style="max-width:200px;font-size:0.8rem">${o.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}</td>
        <td>€${o.total.toFixed(2)}</td>
        <td><span class="status-badge status-${o.status}">${o.status}</span></td>
        <td>${new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
        <td>
          <select class="action-btn action-status" onchange="updateOrderStatus(${o.id}, this.value)">
            <option value="pending" ${o.status==='pending'?'selected':''}>Pending</option>
            <option value="preparing" ${o.status==='preparing'?'selected':''}>Preparing</option>
            <option value="completed" ${o.status==='completed'?'selected':''}>Completed</option>
            <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--grey)">No orders yet</td></tr>';
  } catch {
    showToast('Failed to load orders', 'error');
  }
}

async function updateOrderStatus(id, status) {
  try {
    await fetch(`${API}/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken },
      body: JSON.stringify({ status })
    });
    showToast('Order status updated', 'success');
    loadOrders();
  } catch {
    showToast('Failed to update order status', 'error');
  }
}

// ── Reservations ──────────────────────────────────────────────────────────────
async function loadReservations() {
  try {
    const res = await fetch(`${API}/api/reservations`, { headers: { Authorization: authToken } });
    const reservations = await res.json();
    const sorted = [...reservations].sort((a,b) => new Date(b.date) - new Date(a.date));
    const tbody = document.querySelector('#reservationsTable tbody');
    tbody.innerHTML = sorted.length ? sorted.map(r => `
      <tr>
        <td>
          <div>${r.name}</div>
          <div style="font-size:0.78rem;color:var(--grey)">${r.email}</div>
        </td>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td>${r.guests}</td>
        <td style="max-width:180px;font-size:0.82rem;color:var(--grey)">${r.notes || '—'}</td>
        <td><span class="status-badge status-${r.status}">${r.status}</span></td>
        <td>
          <select class="action-btn action-status" onchange="updateReservationStatus(${r.id}, this.value)">
            <option value="pending" ${r.status==='pending'?'selected':''}>Pending</option>
            <option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmed</option>
            <option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--grey)">No reservations yet</td></tr>';
  } catch {
    showToast('Failed to load reservations', 'error');
  }
}

async function updateReservationStatus(id, status) {
  try {
    await fetch(`${API}/api/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken },
      body: JSON.stringify({ status })
    });
    showToast('Reservation status updated', 'success');
    loadReservations();
  } catch {
    showToast('Failed to update reservation', 'error');
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────────
async function loadReviewsAdmin() {
  try {
    const res = await fetch(`${API}/api/reviews`);
    const reviews = await res.json();
    const sorted = [...reviews].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const tbody = document.querySelector('#reviewsTable tbody');
    tbody.innerHTML = sorted.length ? sorted.map(r => `
      <tr>
        <td>${r.name}</td>
        <td style="color:var(--gold)">
          ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}
          <span style="color:var(--grey);font-size:0.8rem"> (${r.rating}/5)</span>
        </td>
        <td style="max-width:300px;font-size:0.85rem;font-style:italic;color:var(--grey)">"${r.comment}"</td>
        <td>${new Date(r.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--grey)">No reviews yet</td></tr>';
  } catch {
    showToast('Failed to load reviews', 'error');
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
