/**
 * Maison Élara — Customer Frontend Script
 * Handles: menu display, cart, checkout, reservations, reviews
 */
 
const API = ''; // Empty = same origin (relative URLs)
 
// ── State ─────────────────────────────────────────────────────────────────────
let cart = [];
let allMenuItems = [];
let activeCategory = 'all';
 
// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  loadMenu();
  loadReviews();
  initCart();
  initForms();
  initScrollAnimations();
  setMinDate();
});
 
// ── Navigation ─────────────────────────────────────────────────────────────── 
function initNav() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
 
  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
 
  // Hamburger
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
 
  // Close nav on link click (mobile)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });
}
 
// ── Menu ──────────────────────────────────────────────────────────────────────
async function loadMenu() {
  try {
    const res = await fetch(`${API}/api/menu`);
    allMenuItems = await res.json();
    renderMenu(allMenuItems);
    initCategoryTabs();
  } catch (err) {
    document.getElementById('menuGrid').innerHTML = `<p style="color:var(--grey);text-align:center;grid-column:1/-1">Unable to load menu. Please ensure the server is running.</p>`;
  }
}
 
function renderMenu(items) {
  const grid = document.getElementById('menuGrid');
  if (!items.length) {
    grid.innerHTML = `<p style="color:var(--grey);text-align:center;grid-column:1/-1;font-style:italic">No items in this category.</p>`;
    return;
  }
  grid.innerHTML = items.map(item => `
    <div class="menu-card fade-in">
      <div class="card-img">
        <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'">
        <span class="card-category-badge">${item.category}</span>
      </div>
      <div class="card-body">
        <h3 class="card-name">${item.name}</h3>
        <p class="card-desc">${item.description}</p>
        <div class="card-footer">
          <span class="card-price"><sup>€</sup>${item.price.toFixed(2)}</span>
          <button class="add-to-cart" onclick="addToCart('${item.id}')" title="Add to cart">+</button>
        </div>
      </div>
    </div>
  `).join('');
 
  // Trigger animations
  setTimeout(() => {
    grid.querySelectorAll('.fade-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 60);
    });
  }, 50);
}
 
function initCategoryTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      const filtered = activeCategory === 'all'
        ? allMenuItems
        : allMenuItems.filter(i => i.category === activeCategory);
      renderMenu(filtered);
    });
  });
}
 
// ── Cart ──────────────────────────────────────────────────────────────────────
function initCart() {
  const overlay = document.getElementById('cartOverlay');
  const sidebar = document.getElementById('cartSidebar');
  const toggle = document.getElementById('cartToggle');
  const close = document.getElementById('cartClose');
 
  const openCart = () => { overlay.classList.add('open'); sidebar.classList.add('open'); };
  const closeCart = () => { overlay.classList.remove('open'); sidebar.classList.remove('open'); };
 
  toggle.addEventListener('click', e => { e.preventDefault(); openCart(); });
  close.addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
 
  document.getElementById('checkoutBtn').addEventListener('click', () => {
    closeCart();
    openCheckout();
  });
}
 
function addToCart(menuId) {
  const item = allMenuItems.find(i => i.id === menuId);
  if (!item) return;
 
  const existing = cart.find(c => c.id === menuId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  updateCartUI();
  showToast(`${item.name} added to cart`, 'success');
}
 
function removeFromCart(menuId) {
  cart = cart.filter(c => c.id !== menuId);
  updateCartUI();
}
 
function updateQty(menuId, delta) {
  const item = cart.find(c => c.id === menuId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) removeFromCart(menuId);
  else updateCartUI();
}
 
function updateCartUI() {
  const itemsEl = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const badge = document.getElementById('cartBadge');
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
 
  badge.textContent = totalQty;
  badge.classList.toggle('visible', totalQty > 0);
 
  if (!cart.length) {
    itemsEl.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
    footer.style.display = 'none';
    return;
  }
 
  footer.style.display = 'block';
  document.getElementById('cartTotal').textContent = `€${total.toFixed(2)}`;
 
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">€${item.price.toFixed(2)} each</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove">✕</button>
    </div>
  `).join('');
}
 
// ── Checkout ──────────────────────────────────────────────────────────────────
function openCheckout() {
  const modal = document.getElementById('checkoutModal');
  const summary = document.getElementById('orderSummary');
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
 
  summary.innerHTML = `
    <div style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--grey);margin-bottom:0.75rem">Order Summary</div>
    ${cart.map(i => `
      <div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.9rem">
        <span>${i.name} × ${i.quantity}</span>
        <span>€${(i.price * i.quantity).toFixed(2)}</span>
      </div>
    `).join('')}
    <div style="border-top:1px solid var(--cream-dark);margin-top:0.75rem;padding-top:0.75rem;display:flex;justify-content:space-between;font-family:'Playfair Display',serif;font-size:1.1rem">
      <span>Total</span>
      <span style="color:var(--burgundy)">€${total.toFixed(2)}</span>
    </div>
  `;
  modal.classList.add('open');
}
 
function initForms() {
  // Checkout modal close
  document.getElementById('checkoutClose').addEventListener('click', () => {
    document.getElementById('checkoutModal').classList.remove('open');
  });
  document.getElementById('checkoutModal').addEventListener('click', e => {
    if (e.target === document.getElementById('checkoutModal'))
      document.getElementById('checkoutModal').classList.remove('open');
  });
 
  // Checkout form submit
  document.getElementById('checkoutForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    if (!name || !email) { showToast('Please fill in your name and email', 'error'); return; }
 
    const orderData = {
      customerName: name,
      customerEmail: email,
      notes: document.getElementById('custNotes').value,
      items: cart.map(i => ({
        menuItemId: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      total: cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
    };
 
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!res.ok) throw new Error();
      cart = [];
      updateCartUI();
      document.getElementById('checkoutModal').classList.remove('open');
      document.getElementById('checkoutForm').reset();
      showToast('🎉 Order placed successfully! We\'ll prepare it shortly.', 'success');
    } catch {
      showToast('Could not place order. Please try again.', 'error');
    }
  });
 
  // Reservation form
  document.getElementById('reservationForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      date: form.date.value,
      time: form.time.value,
      guests: form.guests.value,
      notes: form.notes.value
    };
    if (!data.name || !data.email || !data.date || !data.time || !data.guests) {
      showToast('Please fill in all required fields', 'error'); return;
    }
 
    try {
      const res = await fetch(`${API}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      form.reset();
      showToast('✨ Reservation confirmed! We look forward to welcoming you.', 'success');
    } catch {
      showToast('Could not submit reservation. Please try again.', 'error');
    }
  });
 
  // Review form
  document.getElementById('reviewForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const rating = form.rating.value;
    const name = form.name.value.trim();
    const comment = form.comment.value.trim();
 
    if (!name || !rating || !comment) {
      showToast('Please fill in all fields and select a rating', 'error'); return;
    }
 
    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating: parseInt(rating), comment })
      });
      if (!res.ok) throw new Error();
      form.reset();
      showToast('Thank you for your review!', 'success');
      loadReviews();
    } catch {
      showToast('Could not submit review. Please try again.', 'error');
    }
  });
}
 
// ── Reviews ───────────────────────────────────────────────────────────────────
async function loadReviews() {
  try {
    const res = await fetch(`${API}/api/reviews`);
    const reviews = await res.json();
    const grid = document.getElementById('reviewsGrid');
    if (!reviews.length) { grid.innerHTML = '<p style="color:var(--grey)">No reviews yet.</p>'; return; }
    grid.innerHTML = reviews.map(r => `
      <div class="review-card fade-in">
        <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p class="review-text">${r.comment}</p>
        <div class="review-author">— <strong>${r.name}</strong> · ${new Date(r.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
      </div>
    `).join('');
    grid.querySelectorAll('.fade-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  } catch {
    document.getElementById('reviewsGrid').innerHTML = '<p style="color:var(--grey)">Reviews unavailable.</p>';
  }
}
 
// ── Utilities ─────────────────────────────────────────────────────────────────
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
 
function setMinDate() {
  const dateInput = document.getElementById('resDate');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
}
 
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });
 
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
 
  // Re-observe dynamically added elements
  new MutationObserver(() => {
    document.querySelectorAll('.fade-in:not(.observed)').forEach(el => {
      el.classList.add('observed');
      observer.observe(el);
    });
  }).observe(document.body, { childList: true, subtree: true });
}
 
