/* ==========================================================================
   AI Garment Management System — Shared Utilities & Data Layer
   Every page includes this file BEFORE its own page script.
   All "database" state lives in LocalStorage under the keys below.
   ========================================================================== */

const AGMS = (() => {

  const KEYS = {
    USERS: 'agms_users',
    SESSION: 'agms_session',
    ORDERS: 'agms_orders',
    WORKERS: 'agms_workers',
    PRODUCTION: 'agms_production',
    PAYMENTS: 'agms_payments',
    THEME: 'agms_theme',
    SIDEBAR: 'agms_sidebar_collapsed',
    SEEDED: 'agms_seeded_v1'
  };

  /* ---------------------------- core storage ---------------------------- */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('AGMS: failed to read', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('AGMS: failed to write', key, e);
      return false;
    }
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
  }

  function formatCurrency(n) {
    const num = Number(n) || 0;
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }

  function toast(message, type = 'success') {
    let host = document.getElementById('agms-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'agms-toast-host';
      host.className = 'agms-toast-host';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `agms-toast agms-toast--${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  /* ------------------------------- seeding ------------------------------- */

  function seedIfNeeded() {
    if (read(KEYS.SEEDED, false)) return;

    if (!read(KEYS.USERS, null)) {
      write(KEYS.USERS, [
        { name: 'Admin User', email: 'admin@agms.com', password: 'admin123', role: 'Administrator', createdAt: new Date().toISOString() }
      ]);
    }

    write(KEYS.WORKERS, [
      { id: uid('WRK'), name: 'Ravi Kumar', department: 'Stitching', salary: 18000, phone: '9876543210', joined: '2024-02-10' },
      { id: uid('WRK'), name: 'Priya Sharma', department: 'Cutting', salary: 16500, phone: '9876501234', joined: '2024-03-05' },
      { id: uid('WRK'), name: 'Anil Verma', department: 'Quality Check', salary: 15000, phone: '9123456789', joined: '2024-01-20' },
      { id: uid('WRK'), name: 'Sunita Devi', department: 'Packing', salary: 13500, phone: '9988776655', joined: '2024-04-12' },
      { id: uid('WRK'), name: 'Manoj Singh', department: 'Stitching', salary: 17500, phone: '9090909090', joined: '2024-05-18' }
    ]);

    const today = new Date();
    const iso = (offset) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };

    write(KEYS.ORDERS, [
      { id: uid('ORD'), product: 'Cotton Kurta - Blue', quantity: 250, status: 'Completed', deliveryDate: iso(-5), createdAt: iso(-20) },
      { id: uid('ORD'), product: 'Denim Jacket - Black', quantity: 120, status: 'In Progress', deliveryDate: iso(4), createdAt: iso(-10) },
      { id: uid('ORD'), product: 'Formal Shirt - White', quantity: 400, status: 'Pending', deliveryDate: iso(10), createdAt: iso(-2) },
      { id: uid('ORD'), product: 'Silk Saree - Maroon', quantity: 80, status: 'In Progress', deliveryDate: iso(6), createdAt: iso(-6) },
      { id: uid('ORD'), product: 'Kids T-Shirt - Yellow', quantity: 600, status: 'Completed', deliveryDate: iso(-1), createdAt: iso(-15) },
      { id: uid('ORD'), product: 'Linen Trousers - Beige', quantity: 150, status: 'Pending', deliveryDate: iso(14), createdAt: iso(-1) }
    ]);

    const prod = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const target = 180 + Math.floor(Math.random() * 40);
      const completed = Math.max(60, target - Math.floor(Math.random() * 60));
      prod.push({ id: uid('PRD'), date: d.toISOString().slice(0, 10), department: ['Stitching', 'Cutting', 'Packing'][i % 3], target, completed });
    }
    write(KEYS.PRODUCTION, prod);

    const workers = read(KEYS.WORKERS, []);
    write(KEYS.PAYMENTS, workers.slice(0, 4).map((w, i) => ({
      id: uid('PAY'),
      workerId: w.id,
      workerName: w.name,
      amount: w.salary,
      status: i % 2 === 0 ? 'Paid' : 'Pending',
      date: iso(-i * 3)
    })));

    write(KEYS.SEEDED, true);
  }

  /* -------------------------------- auth --------------------------------- */

  const auth = {
    getUsers() { return read(KEYS.USERS, []); },
    saveUsers(users) { return write(KEYS.USERS, users); },
    findUser(email) {
      return this.getUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase());
    },
    register(name, email, password) {
      if (this.findUser(email)) return { ok: false, message: 'An account with this email already exists.' };
      const users = this.getUsers();
      users.push({ name, email, password, role: 'Manager', createdAt: new Date().toISOString() });
      this.saveUsers(users);
      return { ok: true };
    },
    login(email, password) {
      const user = this.findUser(email);
      if (!user) return { ok: false, message: 'No account found with this email.' };
      if (user.password !== password) return { ok: false, message: 'Incorrect password. Please try again.' };
      write(KEYS.SESSION, { name: user.name, email: user.email, role: user.role, loginAt: new Date().toISOString() });
      return { ok: true };
    },
    logout() {
      localStorage.removeItem(KEYS.SESSION);
    },
    getSession() {
      return read(KEYS.SESSION, null);
    },
    requireSession() {
      const s = this.getSession();
      if (!s) {
        window.location.href = 'login.html';
        return null;
      }
      return s;
    }
  };

  /* ------------------------------ collections ----------------------------- */

  const orders = {
    all() { return read(KEYS.ORDERS, []); },
    save(list) { return write(KEYS.ORDERS, list); },
    add(order) {
      const list = this.all();
      list.unshift({ id: uid('ORD'), createdAt: new Date().toISOString().slice(0, 10), ...order });
      this.save(list);
    },
    update(id, patch) {
      const list = this.all().map(o => o.id === id ? { ...o, ...patch } : o);
      this.save(list);
    },
    remove(id) {
      this.save(this.all().filter(o => o.id !== id));
    },
    get(id) {
      return this.all().find(o => o.id === id);
    }
  };

  const workers = {
    all() { return read(KEYS.WORKERS, []); },
    save(list) { return write(KEYS.WORKERS, list); },
    add(worker) {
      const list = this.all();
      list.unshift({ id: uid('WRK'), joined: new Date().toISOString().slice(0, 10), ...worker });
      this.save(list);
    },
    update(id, patch) {
      this.save(this.all().map(w => w.id === id ? { ...w, ...patch } : w));
    },
    remove(id) {
      this.save(this.all().filter(w => w.id !== id));
    },
    get(id) {
      return this.all().find(w => w.id === id);
    }
  };

  const production = {
    all() { return read(KEYS.PRODUCTION, []); },
    save(list) { return write(KEYS.PRODUCTION, list); },
    add(entry) {
      const list = this.all();
      list.unshift({ id: uid('PRD'), ...entry });
      this.save(list);
    },
    update(id, patch) {
      this.save(this.all().map(p => p.id === id ? { ...p, ...patch } : p));
    },
    remove(id) {
      this.save(this.all().filter(p => p.id !== id));
    }
  };

  const payments = {
    all() { return read(KEYS.PAYMENTS, []); },
    save(list) { return write(KEYS.PAYMENTS, list); },
    add(entry) {
      const list = this.all();
      list.unshift({ id: uid('PAY'), ...entry });
      this.save(list);
    },
    update(id, patch) {
      this.save(this.all().map(p => p.id === id ? { ...p, ...patch } : p));
    },
    remove(id) {
      this.save(this.all().filter(p => p.id !== id));
    }
  };

  /* -------------------------------- theme --------------------------------- */

  const theme = {
    get() { return read(KEYS.THEME, 'light'); },
    set(mode) { write(KEYS.THEME, mode); },
    apply() {
      const mode = this.get();
      document.documentElement.setAttribute('data-theme', mode);
      const icon = document.querySelector('#darkModeToggle i');
      if (icon) icon.className = mode === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    },
    toggle() {
      const next = this.get() === 'dark' ? 'light' : 'dark';
      this.set(next);
      this.apply();
    }
  };

  /* ------------------------------- layout UX ------------------------------ */

  function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    if (!sidebar) return;

    const collapsed = read(KEYS.SIDEBAR, false);
    if (collapsed) sidebar.classList.add('collapsed');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        write(KEYS.SIDEBAR, sidebar.classList.contains('collapsed'));
      });
    }
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 900 && sidebar.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && !e.target.closest('#mobileMenuToggle')) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Mark active nav link based on current page
    const current = window.location.pathname.split('/').pop() || 'dashboard.html';
    sidebar.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === current) link.classList.add('active');
    });
  }

  function initTopbar() {
    theme.apply();
    const darkBtn = document.getElementById('darkModeToggle');
    if (darkBtn) darkBtn.addEventListener('click', () => theme.toggle());

    const session = auth.getSession();
    const nameEls = document.querySelectorAll('[data-user-name]');
    const avatarEls = document.querySelectorAll('[data-user-avatar]');
    if (session) {
      nameEls.forEach(el => el.textContent = session.name);
      avatarEls.forEach(el => el.textContent = session.name.trim().charAt(0).toUpperCase());
    }

    const logoutBtns = document.querySelectorAll('[data-logout]');
    logoutBtns.forEach(btn => btn.addEventListener('click', () => {
      if (confirmAction('Log out of AI Garment Management System?')) {
        auth.logout();
        window.location.href = 'login.html';
      }
    }));
  }

  function initPage() {
    seedIfNeeded();
    theme.apply();
  }

  return {
    KEYS, read, write, uid, formatCurrency, formatDate, escapeHtml,
    toast, confirmAction, seedIfNeeded, auth, orders, workers,
    production, payments, theme, initSidebar, initTopbar, initPage
  };
})();
