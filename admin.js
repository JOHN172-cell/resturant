(function () {
  'use strict';

  const reservationsKey = 'cinder-salt-reservations';
  const menuKey = 'cinder-salt-availability';
  const menuItems = [
    { id: 'carrots', name: 'Charred carrots', category: 'Starter', price: '$12' },
    { id: 'oysters', name: 'Ember oysters', category: 'Starter', price: '$18' },
    { id: 'chicken', name: 'Coal-roasted chicken', category: 'Main', price: '$28' },
    { id: 'steak', name: 'Hanger steak', category: 'Main', price: '$34' },
    { id: 'panna', name: 'Burnt honey panna cotta', category: 'Dessert', price: '$11' },
    { id: 'spritz', name: 'Salted grapefruit spritz', category: 'Drink', price: '$14' }
  ];
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];
  let reservations = JSON.parse(localStorage.getItem(reservationsKey) || '[]');
  let availability = JSON.parse(localStorage.getItem(menuKey) || '{}');
  let menuSearch = '';

  function formatDate(value) {
    if (!value) return 'Date pending';
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function seedDemoReservation() {
    if (reservations.length) return;
    reservations = [{ id: 'demo-1', name: 'Maya Stone', email: 'maya@example.com', phone: '(718) 555-0147', date: new Date().toISOString().slice(0, 10), time: '7:00 PM', party: '2 guests', seating: 'Window', notes: 'Birthday dinner', status: 'pending' }];
  }

  function renderStats() {
    const covers = reservations.filter(item => item.status !== 'cancelled').reduce((sum, item) => sum + Number.parseInt(item.party, 10) || 0, 0);
    qs('#covers-stat').textContent = covers;
    qs('#pending-stat').textContent = reservations.filter(item => item.status === 'pending').length;
    const cart = JSON.parse(localStorage.getItem('cinder-salt-cart') || '[]');
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
    const matchingItems = menuItems.filter(item => `${item.name} ${item.category}`.toLowerCase().includes(menuSearch.toLowerCase()));
    qs('#admin-menu-list').innerHTML = matchingItems.map(item => { const isAvailable = availability[item.id] !== false; return `<div class="admin-menu-item"><div><strong>${item.name}</strong><p>${item.category} / ${item.price}</p></div><button type="button" class="availability-toggle ${isAvailable ? 'available' : ''}" aria-label="${isAvailable ? 'Hide' : 'Show'} ${item.name}" data-menu-id="${item.id}" aria-pressed="${isAvailable}"></button></div>`; }).join('');
    qs('#menu-search-empty').hidden = matchingItems.length > 0;
    qsa('[data-menu-id]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.menuId;
      availability[id] = availability[id] === false;
      localStorage.setItem(menuKey, JSON.stringify(availability));
      renderMenu();
      renderStats();
    }));
  }

  function renderOrders() {
    const orders = JSON.parse(localStorage.getItem('cinder-salt-cart') || '[]');
    const target = qs('#admin-orders');
    if (!target) return;
    if (!orders.length) { target.innerHTML = '<div class="admin-empty">No open orders in this browser.</div>'; return; }
    target.innerHTML = orders.map(item => `<article class="admin-order-item"><div><strong>${item.quantity} × ${item.name}</strong><p>${item.vegan ? 'Vegan' : 'Standard'} / ${item.spice}${item.exclusions ? ` / No: ${item.exclusions}` : ''}</p></div><strong>$${(item.price * item.quantity).toFixed(2)}</strong></article>`).join('');
  }

  function setupFilters() {
    qsa('[data-reservation-filter]').forEach(button => button.addEventListener('click', () => { qsa('[data-reservation-filter]').forEach(item => item.classList.remove('active')); button.classList.add('active'); renderReservations(button.dataset.reservationFilter); }));
  }

  qs('#menu-search').addEventListener('input', event => {
    menuSearch = event.target.value.trim();
    renderMenu();
  });

  seedDemoReservation();
  qs('#admin-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  renderStats();
  renderReservations();
  renderMenu();
  renderOrders();
  setupFilters();
})();
