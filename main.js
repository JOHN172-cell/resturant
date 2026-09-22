/* Shared interaction layer for navigation, menu customization, cart state, and forms. */
(function () {
  'use strict';

  const cartKey = 'velvet-plate-cart';
  let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
  let selectedDish = null;

  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const money = value => `GH₵${value.toFixed(2)}`;

  function normalizeCurrencyLabels() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach(textNode => {
      textNode.nodeValue = textNode.nodeValue.replace(/\$/g, 'GH₵');
    });
  }

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
    footer.insertAdjacentHTML('beforeend', '<small class="staff-links">Staff access · <a href="admin.html">Admin</a> · <a href="orders.html">Orders</a> · <a href="reservations.html">Reservations</a></small>');
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
    const raw = localStorage.getItem('velvet-plate-menu-data');
    // Seed defaults on genuine first visit only (key completely absent)
    if (raw === null) {
      const defaults = [
        { id: 'carrots', name: 'Charred carrots', category: 'Starter', cuisine: 'Continental', price: 12, description: 'whipped feta, sumac, pistachio', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80' },
        { id: 'oysters', name: 'Ember oysters', category: 'Starter', cuisine: 'Continental', price: 18, description: 'cider mignonette, smoked chili', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80' },
        { id: 'chicken', name: 'Coal-roasted chicken', category: 'Main', cuisine: 'Continental', price: 28, description: 'preserved lemon, chicken jus', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80' },
        { id: 'steak', name: 'Hanger steak', category: 'Main', cuisine: 'Continental', price: 34, description: 'green peppercorn, crispy potato', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80' },
        { id: 'panna', name: 'Burnt honey panna cotta', category: 'Dessert', cuisine: 'Continental', price: 11, description: 'rhubarb, oat crumble', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=400&q=80' },
        { id: 'spritz', name: 'Salted grapefruit spritz', category: 'Drink', cuisine: 'Local drinks', price: 14, description: 'grapefruit, fino sherry, bubbles', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80' }
      ];
      localStorage.setItem('velvet-plate-menu-data', JSON.stringify(defaults));
      return defaults;
    }
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
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
    const currentIds = new Set(menuItems.map(item => item.id));

    // Remove cards for items that have been deleted from admin
    qsa('.menu-card', menuGrid).forEach(card => {
      if (card.dataset.id && !currentIds.has(card.dataset.id)) {
        card.remove();
      }
    });

    if (!menuItems.length) return;

    const menuCards = qsa('.menu-card', menuGrid);
    const existingIds = new Set(menuCards.map(card => card.dataset.id));
    const list = menuItems.filter(item => !existingIds.has(item.id));
    if (!list.length) return;

    const html = list.map((item, index) => `
      <article class="menu-card" data-category="${item.category.toLowerCase()}s" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-description="${item.description || item.name}">
        <div class="menu-image menu-image-${(index % 6) + 1}"${item.image ? ` style="background-image:url('${item.image}')"` : ''}><span>${String(menuCards.length + index + 1).padStart(2, '0')}</span></div>
        <div class="menu-card-body"><div><span class="card-category">${item.cuisine} / ${item.category}</span><h2>${item.name}</h2><p>${item.description || 'Freshly made and ready to serve'}</p></div><strong>GH₵${Number(item.price).toFixed(2)}</strong></div>
        <button class="add-button" type="button">Customize & add <span>+</span></button>
      </article>
    `).join('');

    menuGrid.insertAdjacentHTML('beforeend', html);
    setupCustomization();
  }

  function applyMenuAvailability() {
    const availability = JSON.parse(localStorage.getItem('velvet-plate-availability') || '{}');
    const menuData = JSON.parse(localStorage.getItem('velvet-plate-menu-data') || '[]');
    const validIds = new Set(menuData.map(item => String(item.id)));
    qsa('.menu-card').forEach(card => {
      const id = card.dataset.id;
      // Remove if marked unavailable OR if the item has been deleted entirely
      if (availability[id] === false || (id && !validIds.has(id))) card.remove();
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
        const orderData = { id: `order-${Date.now()}`, createdAt: new Date().toISOString(), items: cart, status: 'new' };
        const orders = JSON.parse(localStorage.getItem('velvet-plate-orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('velvet-plate-orders', JSON.stringify(orders));
        
        // Post to backend API
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        }).catch(err => console.log('Backend API sync notice:', err));

        cart = [];
        saveCart();
      }
    }));
  }

  function showMessage(form, message, success = false) {
    const output = qs('.form-message', form);
    if (!output) return;
    output.textContent = message;
    output.classList.toggle('success', success);
  }

  function setupForms() {
    const reservationForm = qs('#reservation-form');
    reservationForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (!reservationForm.checkValidity()) { showMessage(reservationForm, 'Please fill in each required field.'); reservationForm.reportValidity(); return; }
      const data = new FormData(reservationForm);
      const resPayload = { id: `reservation-${Date.now()}`, name: data.get('name'), email: data.get('email'), phone: data.get('phone'), date: data.get('date'), time: data.get('time'), party: data.get('party'), seating: data.get('seating'), notes: data.get('notes'), status: 'pending' };
      const reservations = JSON.parse(localStorage.getItem('velvet-plate-reservations') || '[]');
      reservations.push(resPayload);
      localStorage.setItem('velvet-plate-reservations', JSON.stringify(reservations));
      
      // Post to backend API
      fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resPayload)
      }).catch(err => console.log('Backend API sync notice:', err));

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
  normalizeCurrencyLabels();

  window.addEventListener('menu:updated', () => {
    renderDynamicMenu();
    applyMenuAvailability();
    setupCustomization();
  });
})();
