(function () {
  'use strict';

  const ordersKey = 'velvet-plate-orders';
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];
  let orders = JSON.parse(localStorage.getItem(ordersKey) || localStorage.getItem('cinder-salt-orders') || '[]');

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

  qs('#orders-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  qs('#refresh-orders').addEventListener('click', () => { orders = JSON.parse(localStorage.getItem(ordersKey) || localStorage.getItem('cinder-salt-orders') || '[]'); render(); });
  render();
})();
