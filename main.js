/* Shared interaction layer for navigation, menu customization, cart state, and forms. */
(function () {
  'use strict';

  const cartKey = 'velvet-plate-cart';
  let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
  let selectedDish = null;

  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const money = value => `$${value.toFixed(2)}`;

  function saveCart() {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    renderCart();
  }

  function setupNavigation() {
    const toggle = qs('.menu-toggle');
    const nav = qs('.site-nav');
    if (nav && !qs('a[href="about.html"]', nav)) {
      nav.insertAdjacentHTML('beforeend', '<a href="about.html">About</a>');
    }
    if (nav) {
      const currentPage = document.body.dataset.page;
      qsa('a', nav).forEach(link => link.classList.toggle('active', link.getAttribute('href') === `${currentPage === 'home' ? 'index' : currentPage}.html`));
    }
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      });
    }
    qsa('.cart-trigger').forEach(button => button.addEventListener('click', openCart));
    qsa('.close-cart, .drawer-scrim').forEach(button => button.addEventListener('click', closeCart));
  }

  function setupStaffAccess() {
    const footer = qs('.site-footer');
    if (!footer || qs('.staff-links', footer)) return;
    footer.insertAdjacentHTML('beforeend', '<small class="staff-links">Staff access · <a href="admin.html">Admin</a> · <a href="orders.html">Orders</a></small>');
  }

  function openCart() {
    const drawer = qs('.cart-drawer');
    const scrim = qs('.drawer-scrim');
    if (!drawer) return;
    drawer.classList.add('open');
    scrim?.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
  }

  function closeCart() {
    const drawer = qs('.cart-drawer');
    const scrim = qs('.drawer-scrim');
    drawer?.classList.remove('open');
    scrim?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
  }

  function setupFilters() {
    qsa('.filter-button').forEach(button => button.addEventListener('click', () => {
      qsa('.filter-button').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const filter = button.dataset.filter;
      qsa('.menu-card').forEach(card => card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter));
    }));
  }

  function loadMenuItems() {
    const stored = JSON.parse(localStorage.getItem('velvet-plate-menu-data') || 'null');
    if (!Array.isArray(stored) || !stored.length) return [];
    return stored.map(item => ({
      id: String(item.id || 'dish'),
      name: String(item.name || 'Untitled dish'),
      category: String(item.category || 'Starter'),
      cuisine: String(item.cuisine || 'Continental'),
      price: Number(item.price) || 0,
      description: String(item.description || ''),
      image: String(item.image || (Array.isArray(item.images) ? item.images[0] : '') || '')
    }));
  }

  function renderDynamicMenu() {
    const menuGrid = qs('.menu-grid');
    if (!menuGrid) return;

    const menuItems = loadMenuItems();
    if (!menuItems.length) return;

    const menuCards = qsa('.menu-card', menuGrid);
    const existingIds = new Set(menuCards.map(card => card.dataset.id));
    const list = menuItems.filter(item => !existingIds.has(item.id));
    if (!list.length) return;

    const html = list.map((item, index) => `
      <article class="menu-card" data-category="${item.category.toLowerCase()}s" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-description="${item.description || item.name}">
        <div class="menu-image menu-image-${(index % 6) + 1}"${item.image ? ` style="background-image:url('${item.image}')"` : ''}><span>${String(menuCards.length + index + 1).padStart(2, '0')}</span></div>
        <div class="menu-card-body"><div><span class="card-category">${item.cuisine} / ${item.category}</span><h2>${item.name}</h2><p>${item.description || 'Freshly made and ready to serve'}</p></div><strong>$${Number(item.price).toFixed(2)}</strong></div>
        <button class="add-button" type="button">Customize & add <span>+</span></button>
      </article>
    `).join('');

    menuGrid.insertAdjacentHTML('beforeend', html);
    setupCustomization();
  }

  function applyMenuAvailability() {
    const availability = JSON.parse(localStorage.getItem('velvet-plate-availability') || '{}');
    qsa('.menu-card').forEach(card => {
      if (availability[card.dataset.id] === false) card.remove();
    });
  }

  function setupCustomization() {
    qsa('.add-button').forEach(button => button.addEventListener('click', () => {
      const card = button.closest('.menu-card');
      selectedDish = { id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price), description: card.dataset.description };
      qs('#modal-title').textContent = selectedDish.name;
      qs('.modal-description').textContent = selectedDish.description;
      const modal = qs('.modal-layer');
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('locked');
    }));
    qsa('.modal-close').forEach(button => button.addEventListener('click', closeModal));
    qs('.modal-layer')?.addEventListener('click', event => { if (event.target.classList.contains('modal-layer')) closeModal(); });
    qs('.modal-add')?.addEventListener('click', addCustomizedItem);
  }

  function closeModal() {
    const modal = qs('.modal-layer');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
  }

  function addCustomizedItem() {
    if (!selectedDish) return;
    const extras = qsa('.check-grid input:checked').map(input => input.value);
    const extraCost = extras.reduce((sum, extra) => sum + (extra === 'Crispy shallots' ? 2 : extra === 'Side of bread' ? 3 : 1), 0);
    const item = { ...selectedDish, vegan: qs('#vegan-choice').checked, spice: qs('input[name="spice"]:checked').value, extras, exclusions: qs('#exclusions').value.trim(), price: selectedDish.price + extraCost, quantity: 1 };
    const match = cart.find(entry => entry.id === item.id && entry.vegan === item.vegan && entry.spice === item.spice && entry.exclusions === item.exclusions && JSON.stringify(entry.extras) === JSON.stringify(item.extras));
    if (match) match.quantity += 1; else cart.push(item);
    saveCart();
    closeModal();
    openCart();
    resetCustomization();
  }

  function resetCustomization() {
    qs('#vegan-choice') && (qs('#vegan-choice').checked = false);
    qsa('.check-grid input').forEach(input => { input.checked = false; });
    qs('#exclusions') && (qs('#exclusions').value = '');
    const mild = qs('input[name="spice"][value="Mild"]');
    if (mild) mild.checked = true;
  }

  function renderCart() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    qsa('.cart-count').forEach(count => { count.textContent = totalItems; });
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    qsa('.cart-total').forEach(element => { element.textContent = money(total); });
    qsa('.checkout-button').forEach(button => { button.disabled = cart.length === 0; });
    const items = qs('.cart-items');
    const empty = qs('.cart-empty');
    if (!items || !empty) return;
    empty.style.display = cart.length ? 'none' : 'block';
    items.innerHTML = cart.map((item, index) => `<article class="cart-line"><div><h3>${item.name}</h3><p>${item.vegan ? 'Vegan' : 'Standard'} / ${item.spice}<br>${item.extras.length ? `+ ${item.extras.join(', ')}<br>` : ''}${item.exclusions ? `No: ${item.exclusions}` : ''}</p></div><strong>${money(item.price * item.quantity)}</strong><div class="cart-controls"><button type="button" data-action="decrease" data-index="${index}" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-action="increase" data-index="${index}" aria-label="Increase quantity">+</button><button class="remove-item" type="button" data-action="remove" data-index="${index}" aria-label="Remove item">×</button></div></article>`).join('');
    qsa('[data-action]', items).forEach(button => button.addEventListener('click', () => updateQuantity(Number(button.dataset.index), button.dataset.action)));
  }

  function updateQuantity(index, action) {
    if (action === 'increase') cart[index].quantity += 1;
    if (action === 'decrease') cart[index].quantity -= 1;
    if (action === 'remove' || cart[index].quantity < 1) cart.splice(index, 1);
    saveCart();
  }

  function setupCheckout() {
    qsa('.checkout-button').forEach(button => button.addEventListener('click', () => {
      if (!cart.length) return;
      closeCart();
      const layer = qs('.checkout-layer');
      layer?.classList.add('open');
      layer?.setAttribute('aria-hidden', 'false');
      document.body.classList.add('locked');
    }));
    qsa('.checkout-close, .checkout-done').forEach(button => button.addEventListener('click', () => {
      const layer = qs('.checkout-layer');
      layer?.classList.remove('open');
      layer?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('locked');
      if (button.classList.contains('checkout-done')) {
        const orders = JSON.parse(localStorage.getItem('velvet-plate-orders') || '[]');
        orders.push({ id: `order-${Date.now()}`, createdAt: new Date().toISOString(), items: cart, status: 'new' });
        localStorage.setItem('velvet-plate-orders', JSON.stringify(orders));
        cart = [];
        saveCart();
      }
    }));
  }

  function showMessage(form, message, success = false) {
    const output = qs('.form-message', form);
    output.textContent = message;
    output.classList.toggle('success', success);
  }

  function setupForms() {
    const reservationForm = qs('#reservation-form');
    reservationForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (!reservationForm.checkValidity()) { showMessage(reservationForm, 'Please fill in each required field.'); reservationForm.reportValidity(); return; }
      const data = new FormData(reservationForm);
      const reservations = JSON.parse(localStorage.getItem('velvet-plate-reservations') || '[]');
      reservations.push({ id: `reservation-${Date.now()}`, name: data.get('name'), email: data.get('email'), phone: data.get('phone'), date: data.get('date'), time: data.get('time'), party: data.get('party'), seating: data.get('seating'), notes: data.get('notes'), status: 'pending' });
      localStorage.setItem('velvet-plate-reservations', JSON.stringify(reservations));
      showMessage(reservationForm, `Thanks, ${data.get('name')}. Your table for ${data.get('party')} on ${data.get('date')} at ${data.get('time')} is requested. We’ll confirm by email shortly.`, true);
      reservationForm.reset();
    });
    const contactForm = qs('#contact-form');
    contactForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (!contactForm.checkValidity()) { showMessage(contactForm, 'Please add your name, email, and message.'); contactForm.reportValidity(); return; }
      showMessage(contactForm, 'Message sent. We’ll get back to you soon.', true);
      contactForm.reset();
    });
  }

  setupNavigation();
  setupStaffAccess();
  renderDynamicMenu();
  setupFilters();
  applyMenuAvailability();
  setupCustomization();
  setupCheckout();
  setupForms();
  renderCart();

  window.addEventListener('menu:updated', () => {
    renderDynamicMenu();
    applyMenuAvailability();
    setupCustomization();
  });
})();
