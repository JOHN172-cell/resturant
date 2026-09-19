(function () {
  'use strict';

  const reservationsKey = 'velvet-plate-reservations';
  const menuKey = 'velvet-plate-availability';
  const menuDataKey = 'velvet-plate-menu-data';
  const adminUsername = 'admin123';
  const adminPassword = 'password';
  const defaultMenuItems = [
    { id: 'carrots', name: 'Charred carrots', category: 'Starter', price: 12, description: 'whipped feta, sumac, pistachio' },
    { id: 'oysters', name: 'Ember oysters', category: 'Starter', price: 18, description: 'cider mignonette, smoked chili' },
    { id: 'chicken', name: 'Coal-roasted chicken', category: 'Main', price: 28, description: 'preserved lemon, chicken jus' },
    { id: 'steak', name: 'Hanger steak', category: 'Main', price: 34, description: 'green peppercorn, crispy potato' },
    { id: 'panna', name: 'Burnt honey panna cotta', category: 'Dessert', price: 11, description: 'rhubarb, oat crumble' },
    { id: 'spritz', name: 'Salted grapefruit spritz', category: 'Drink', price: 14, description: 'grapefruit, fino sherry, bubbles' }
  ];

  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];
  const money = value => `$${Number(value).toFixed(2)}`;

  let reservations = JSON.parse(localStorage.getItem(reservationsKey) || localStorage.getItem('cinder-salt-reservations') || '[]');
  let menuItems = loadMenuItems();
  let availability = loadAvailability();
  let menuSearch = '';

  function loadMenuItems() {
    const stored = JSON.parse(localStorage.getItem(menuDataKey) || localStorage.getItem('cinder-salt-menu-data') || 'null');
    if (!Array.isArray(stored) || !stored.length) {
      localStorage.setItem(menuDataKey, JSON.stringify(defaultMenuItems));
      return [...defaultMenuItems];
    }
    return stored.map(item => ({
      id: String(item.id || slugify(item.name || 'dish')),
      name: String(item.name || 'Untitled dish'),
      category: String(item.category || 'Starter'),
      price: Number(item.price) || 0,
      description: String(item.description || '')
    }));
  }

  function loadAvailability() {
    const state = JSON.parse(localStorage.getItem(menuKey) || localStorage.getItem('cinder-salt-availability') || '{}');
    menuItems.forEach(item => {
      if (state[item.id] === undefined) state[item.id] = true;
    });
    localStorage.setItem(menuKey, JSON.stringify(state));
    return state;
  }

  function slugify(value) {
    return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `dish-${Date.now()}`;
  }

  function formatDate(value) {
    if (!value) return 'Date pending';
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function seedDemoReservation() {
    if (reservations.length) return;
    reservations = [{ id: 'demo-1', name: 'Maya Stone', email: 'maya@example.com', phone: '(718) 555-0147', date: new Date().toISOString().slice(0, 10), time: '7:00 PM', party: '2 guests', seating: 'Window', notes: 'Birthday dinner', status: 'pending' }];
    localStorage.setItem(reservationsKey, JSON.stringify(reservations));
  }

  function renderStats() {
    const covers = reservations.filter(item => item.status !== 'cancelled').reduce((sum, item) => sum + Number.parseInt(item.party, 10) || 0, 0);
    qs('#covers-stat').textContent = covers;
    qs('#pending-stat').textContent = reservations.filter(item => item.status === 'pending').length;
    const cart = JSON.parse(localStorage.getItem('velvet-plate-cart') || localStorage.getItem('cinder-salt-cart') || '[]');
    qs('#orders-stat').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    qs('#menu-stat').textContent = menuItems.filter(item => availability[item.id] !== false).length;
    qs('#inbox-note').textContent = reservations.some(item => item.status === 'pending') ? 'Requests need attention' : 'No new requests';
  }

  function renderReservations(filter = 'all') {
    const list = qs('#reservation-list');
    const empty = qs('#reservation-empty');
    const visible = reservations.filter(item => filter === 'all' || item.status === filter);
    empty.hidden = visible.length > 0;
    list.innerHTML = visible.map(item => `<tr><td>${item.name}<small>${item.email}</small></td><td>${formatDate(item.date)}<small>${item.time}</small></td><td>${item.party}</td><td>${item.seating || 'No preference'}</td><td><span class="reservation-status ${item.status}">${item.status}</span></td><td><div class="table-actions">${item.status === 'pending' ? `<button type="button" data-reservation-action="confirmed" data-id="${item.id}">Confirm</button><button type="button" data-reservation-action="cancelled" data-id="${item.id}">Decline</button>` : `<button type="button" data-reservation-action="pending" data-id="${item.id}">Reopen</button>`}</div></td></tr>`).join('');
    qsa('[data-reservation-action]').forEach(button => button.addEventListener('click', () => updateReservation(button.dataset.id, button.dataset.reservationAction)));
  }

  function updateReservation(id, status) {
    const reservation = reservations.find(item => item.id === id);
    if (!reservation) return;
    reservation.status = status;
    localStorage.setItem(reservationsKey, JSON.stringify(reservations));
    renderReservations();
    renderStats();
  }

  function renderMenu() {
    const searchTerm = menuSearch.trim().toLowerCase();
    const matchingItems = menuItems.filter(item => {
      if (!searchTerm) return true;
      const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    qs('#admin-menu-list').innerHTML = matchingItems.map(item => {
      const isAvailable = availability[item.id] !== false;
      return `<div class="admin-menu-item"><div><strong>${item.name}</strong><p>${item.category} / ${money(item.price)}</p></div><button type="button" class="availability-toggle ${isAvailable ? 'available' : ''}" aria-label="${isAvailable ? 'Hide' : 'Show'} ${item.name}" data-menu-id="${item.id}" aria-pressed="${isAvailable}"></button></div>`;
    }).join('');

    qs('#menu-search-empty').hidden = matchingItems.length > 0;
    qsa('[data-menu-id]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.menuId;
      availability[id] = availability[id] === false;
      localStorage.setItem(menuKey, JSON.stringify(availability));
      renderMenu();
      renderStats();
      window.dispatchEvent(new CustomEvent('menu:updated'));
    }));
  }

  function addMenuItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || 'Starter');
    const price = Number(formData.get('price'));

    if (!name || !Number.isFinite(price) || price <= 0) {
      return;
    }

    const item = {
      id: slugify(name),
      name,
      category,
      price,
      description: `${category.toLowerCase()} special`
    };

    const existingIndex = menuItems.findIndex(entry => entry.id === item.id || entry.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      menuItems[existingIndex] = { ...menuItems[existingIndex], ...item };
    } else {
      menuItems.push(item);
    }

    availability[item.id] = true;
    localStorage.setItem(menuDataKey, JSON.stringify(menuItems));
    localStorage.setItem(menuKey, JSON.stringify(availability));
    form.reset();
    renderMenu();
    renderStats();
    window.dispatchEvent(new CustomEvent('menu:updated'));
  }

  function renderOrders() {
    const orders = JSON.parse(localStorage.getItem('velvet-plate-cart') || localStorage.getItem('cinder-salt-cart') || '[]');
    const target = qs('#admin-orders');
    if (!target) return;
    if (!orders.length) { target.innerHTML = '<div class="admin-empty">No open orders in this browser.</div>'; return; }
    target.innerHTML = orders.map(item => `<article class="admin-order-item"><div><strong>${item.quantity} × ${item.name}</strong><p>${item.vegan ? 'Vegan' : 'Standard'} / ${item.spice}${item.exclusions ? ` / No: ${item.exclusions}` : ''}</p></div><strong>$${(item.price * item.quantity).toFixed(2)}</strong></article>`).join('');
  }

  function setupFilters() {
    qsa('[data-reservation-filter]').forEach(button => button.addEventListener('click', () => { qsa('[data-reservation-filter]').forEach(item => item.classList.remove('active')); button.classList.add('active'); renderReservations(button.dataset.reservationFilter); }));
  }

  function setupAuth() {
    const authPanel = qs('#admin-auth');
    const app = qs('#admin-app');
    const form = qs('#admin-login-form');
    const error = qs('#admin-auth-error');
    const lockButton = qs('#admin-lock');
    const loginSplash = qs('.admin-login-splash');
    const passwordField = qs('#admin-password');
    const usernameField = qs('#admin-username');
    const showPasswordButton = qs('#togglePw');

    const unlock = () => {
      authPanel.hidden = true;
      app.hidden = false;
      loginSplash?.setAttribute('hidden', 'hidden');
      sessionStorage.setItem('velvet-plate-admin-auth', 'true');
    };

    const lock = () => {
      sessionStorage.removeItem('velvet-plate-admin-auth');
      app.hidden = true;
      authPanel.hidden = false;
      loginSplash?.removeAttribute('hidden');
      form.reset();
      error.textContent = '';
      usernameField?.focus();
    };

    if (sessionStorage.getItem('velvet-plate-admin-auth') === 'true' || sessionStorage.getItem('cinder-salt-admin-auth') === 'true') {
      unlock();
    }

    form?.addEventListener('submit', event => {
      event.preventDefault();
      const username = String(new FormData(form).get('username') || '').trim();
      const password = String(new FormData(form).get('password') || '').trim();

      if (username === adminUsername && password === adminPassword) {
        unlock();
        return;
      }

      error.textContent = 'Incorrect username or password. Please try again.';
      form.reset();
      usernameField?.focus();
    });

    showPasswordButton?.addEventListener('click', () => {
      const isPassword = passwordField.type === 'password';
      passwordField.type = isPassword ? 'text' : 'password';
      showPasswordButton.textContent = isPassword ? 'Hide' : 'Show';
    });

    lockButton?.addEventListener('click', lock);
  }

  const slides = qsa('.admin-login-slide');
  let currentSlideIndex = 0;

  if (slides.length) {
    setInterval(() => {
      currentSlideIndex = (currentSlideIndex + 1) % slides.length;
      slides.forEach((slide, index) => slide.classList.toggle('is-active', index === currentSlideIndex));
    }, 5000);
  }

  const menuSearchInput = qs('#menu-search');
  menuSearchInput?.addEventListener('input', event => {
    menuSearch = event.target.value;
    renderMenu();
  });

  qs('#add-menu-form')?.addEventListener('submit', addMenuItem);

  seedDemoReservation();
  qs('#admin-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  setupAuth();
  renderStats();
  renderReservations();
  renderMenu();
  renderOrders();
  setupFilters();
})();
