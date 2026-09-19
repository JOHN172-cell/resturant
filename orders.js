(function () {
  'use strict';

  const ordersKey = 'velvet-plate-orders';
  const reservationsKey = 'velvet-plate-reservations';
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];
  let orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
  let reservations = JSON.parse(localStorage.getItem(reservationsKey) || '[]');

  function render() {
    const groups = { new: [], progress: [], done: [] };
    orders.forEach(order => groups[order.status === 'new' ? 'new' : order.status === 'progress' ? 'progress' : 'done'].push(order));
    qs('#new-order-count').textContent = groups.new.length;
    qs('#active-order-count').textContent = groups.progress.length;
    qs('#new-column-count').textContent = groups.new.length;
    qs('#progress-column-count').textContent = groups.progress.length;
    qs('#done-column-count').textContent = groups.done.length;
    renderGroup('#new-orders', groups.new, 'progress', 'Start preparing');
    renderGroup('#progress-orders', groups.progress, 'done', 'Mark ready');
    renderGroup('#done-orders', groups.done, 'done', 'Completed');
  }

  function renderGroup(selector, items, nextStatus, actionLabel) {
    const target = qs(selector);
    if (!items.length) { target.innerHTML = '<div class="order-empty">Nothing here right now.</div>'; return; }
    target.innerHTML = items.slice().reverse().map(order => `<article class="order-card ${order.status}"><div class="order-card-top"><strong>Order #${order.id.slice(-4)}</strong><time>${new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><ul class="order-items">${order.items.map(item => `<li><strong>${item.quantity} × ${item.name}</strong><span>$${(item.price * item.quantity).toFixed(2)}</span></li>`).join('')}</ul><p class="order-preferences">${order.items.map(item => `${item.vegan ? 'Vegan' : 'Standard'} / ${item.spice}${item.extras.length ? ` / + ${item.extras.join(', ')}` : ''}${item.exclusions ? ` / No: ${item.exclusions}` : ''}`).join('<br>')}</p><button type="button" class="order-action" data-order-id="${order.id}" data-next-status="${nextStatus}" ${order.status === 'done' ? 'disabled' : ''}>${actionLabel}</button></article>`).join('');
    qsa(`${selector} [data-order-id]`).forEach(button => button.addEventListener('click', () => updateOrder(button.dataset.orderId, button.dataset.nextStatus)));
  }

  function updateOrder(id, status) {
    const order = orders.find(item => item.id === id);
    if (!order) return;
    order.status = status;
    localStorage.setItem(ordersKey, JSON.stringify(orders));
    render();
  }

  function formatDate(value) {
    if (!value) return 'Date pending';
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function renderReservations(filter = 'all') {
    const list = qs('#reservation-list');
    const empty = qs('#reservation-empty');
    if (!list || !empty) return;
    const visible = reservations.filter(item => filter === 'all' || item.status === filter);
    empty.hidden = visible.length > 0;
    list.innerHTML = visible.map(item => `<tr><td>${item.name}<small>${item.email}</small></td><td>${formatDate(item.date)}<small>${item.time}</small></td><td>${item.party}</td><td>${item.seating || 'No preference'}</td><td><span class="reservation-status ${item.status}">${item.status}</span></td><td><div class="table-actions">${item.status === 'pending' ? `<button type="button" data-reservation-action="confirmed" data-id="${item.id}">Confirm</button><button type="button" data-reservation-action="cancelled" data-id="${item.id}">Decline</button>` : `<button type="button" data-reservation-action="pending" data-id="${item.id}">Reopen</button>`}</div></td></tr>`).join('');
    qsa('[data-reservation-action]').forEach(button => button.addEventListener('click', () => updateReservation(button.dataset.id, button.dataset.reservationAction, filter)));
  }

  function updateReservation(id, status, filter) {
    const reservation = reservations.find(item => item.id === id);
    if (!reservation) return;
    reservation.status = status;
    localStorage.setItem(reservationsKey, JSON.stringify(reservations));
    renderReservations(filter);
  }

  qs('#orders-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  qs('#refresh-orders').addEventListener('click', () => {
    orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
    reservations = JSON.parse(localStorage.getItem(reservationsKey) || '[]');
    render();
    renderReservations();
  });
  qsa('[data-reservation-filter]').forEach(button => button.addEventListener('click', () => {
    qsa('[data-reservation-filter]').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    renderReservations(button.dataset.reservationFilter);
  }));
  render();
  renderReservations();
})();
