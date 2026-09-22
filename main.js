/* Shared interaction layer for navigation, menu customization, cart state, and forms. */
(function () {
  'use strict';

  const cartKey = 'velvet-plate-cart';
  let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
  let selectedDish = null;

  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const money = value => `₵${value.toFixed(2)}`;

  function normalizeCurrencyLabels() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach(textNode => {
      textNode.nodeValue = textNode.nodeValue.replace(/GH₵|\$/g, '₵');
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

  function loadMenuItems() {
    const raw = localStorage.getItem('velvet-plate-menu-data');
    if (raw === null) {
      const defaults = [
        // Starters
        { id: 'carrots', name: 'Charred Heirloom Carrots', category: 'Starters', cuisine: 'Continental', price: 22, description: 'Whipped feta, sumac oil, toasted pistachio crumble.', vegetarian: true, vegan: false, glutenFree: true, image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=600&q=80' },
        { id: 'oysters', name: 'Ember Roasted Oysters', category: 'Starters', cuisine: 'Seafood', price: 35, description: 'Apple cider mignonette, smoked chili butter, micro sea greens.', vegetarian: false, vegan: false, glutenFree: true, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80' },
        { id: 'bruschetta', name: 'Wild Mushroom Bruschetta', category: 'Starters', cuisine: 'Italian', price: 25, description: 'Sautéed forest mushrooms, garlic oil, thyme on artisan sourdough.', vegetarian: true, vegan: true, glutenFree: false, image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80' },

        // Main Courses
        { id: 'chicken', name: 'Coal-Roasted Heritage Chicken', category: 'Main Courses', cuisine: 'Wood-Fired', price: 45, description: 'Preserved lemon, braised seasonal greens, rosemary chicken jus.', vegetarian: false, vegan: false, glutenFree: true, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80' },
        { id: 'steak', name: 'Wood-Grilled Hanger Steak', category: 'Main Courses', cuisine: 'Steakhouse', price: 55, description: 'Green peppercorn emulsion, triple-cooked crispy garlic potatoes.', vegetarian: false, vegan: false, glutenFree: true, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80' },
        { id: 'margherita', name: 'Wood-Fired Margherita Pizza', category: 'Main Courses', cuisine: 'Artisan Pizza', price: 34, description: 'San Marzano tomatoes, fresh fior di latte, basil, olive oil.', vegetarian: true, vegan: false, glutenFree: false, image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80' },
        { id: 'pasta', name: 'Truffle Mushroom Tagliatelle', category: 'Main Courses', cuisine: 'Handmade Pasta', price: 38, description: 'Handcrafted ribbon pasta, black truffle oil, wild forest ragù.', vegetarian: true, vegan: true, glutenFree: false, image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281288?auto=format&fit=crop&w=600&q=80' },

        // Desserts
        { id: 'panna', name: 'Burnt Honey Panna Cotta', category: 'Desserts', cuisine: 'Patisserie', price: 20, description: 'Poached rhubarb, toasted oat crumble, vanilla blossom.', vegetarian: true, vegan: false, glutenFree: true, image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=80' },
        { id: 'chocolate', name: 'Decadent Dark Chocolate Cake', category: 'Desserts', cuisine: 'Patisserie', price: 24, description: '70% Valrhona dark chocolate, wild berry reduction, sea salt.', vegetarian: true, vegan: true, glutenFree: false, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80' },

        // Drinks
        { id: 'spritz', name: 'Salted Grapefruit Spritz', category: 'Drinks', cuisine: 'Craft Cocktail', price: 18, description: 'Fresh grapefruit juice, fino sherry, sparkling soda, rosemary.', vegetarian: true, vegan: true, glutenFree: true, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80' },
        { id: 'cooler', name: 'Hibiscus Ginger Elixir', category: 'Drinks', cuisine: 'Artisanal Drink', price: 15, description: 'Organic hibiscus brew, crushed Ghanaian ginger, fresh mint.', vegetarian: true, vegan: true, glutenFree: true, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80' }
      ];
      localStorage.setItem('velvet-plate-menu-data', JSON.stringify(defaults));
      return defaults;
    }
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return stored.map(item => ({
      id: String(item.id || 'dish'),
      name: String(item.name || 'Untitled dish'),
      category: String(item.category || 'Starters'),
      cuisine: String(item.cuisine || 'Continental'),
      price: Number(item.price) || 0,
      description: String(item.description || ''),
      vegetarian: Boolean(item.vegetarian ?? (item.description && item.description.toLowerCase().includes('vegetarian'))),
      vegan: Boolean(item.vegan ?? (item.description && item.description.toLowerCase().includes('vegan'))),
      glutenFree: Boolean(item.glutenFree ?? (item.description && (item.description.toLowerCase().includes('gluten') || item.description.toLowerCase().includes('gluten-free')))),
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
      <article class="menu-card" 
        data-category="${item.category.toLowerCase()}" 
        data-id="${item.id}" 
        data-name="${item.name}" 
        data-price="${item.price}" 
        data-description="${item.description || item.name}"
        data-veg="${item.vegetarian ? 'true' : 'false'}"
        data-vegan="${item.vegan ? 'true' : 'false'}"
        data-gf="${item.glutenFree ? 'true' : 'false'}">
        <div class="menu-image"${item.image ? ` style="background-image:url('${item.image}')"` : ''}>
          <span>${String(menuCards.length + index + 1).padStart(2, '0')}</span>
        </div>
        <div class="menu-card-body">
          <span class="card-category">${item.cuisine} / ${item.category}</span>
          <h2>${item.name}</h2>
          <p>${item.description || 'Freshly prepared wood-fired culinary dish'}</p>
          <div class="menu-card-footer">
            <strong>${money(Number(item.price))}</strong>
            <button class="order-now-btn add-button" type="button">Order Now <span>+</span></button>
          </div>
        </div>
      </article>
    `).join('');

    menuGrid.insertAdjacentHTML('beforeend', html);
    setupCustomization();
    applyMenuFilters();
  }

  function applyMenuAvailability() {
    const availability = JSON.parse(localStorage.getItem('velvet-plate-availability') || '{}');
    const menuData = JSON.parse(localStorage.getItem('velvet-plate-menu-data') || '[]');
    const validIds = new Set(menuData.map(item => String(item.id)));
    qsa('.menu-card').forEach(card => {
      const id = card.dataset.id;
      if (availability[id] === false || (id && !validIds.has(id))) card.remove();
    });
  }

  function applyMenuFilters() {
    const searchVal = (qs('#menu-search-input')?.value || '').toLowerCase().trim();
    const activeCatBtn = qs('.menu-cat-btn.active');
    const catFilter = activeCatBtn ? activeCatBtn.dataset.filter.toLowerCase() : 'all';
    
    const activeDietPills = qsa('.diet-pill.active').map(pill => pill.dataset.diet.toLowerCase());

    qsa('.menu-card').forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const desc = (card.dataset.description || '').toLowerCase();
      const cat = (card.dataset.category || '').toLowerCase();
      const isVeg = card.dataset.veg === 'true';
      const isVegan = card.dataset.vegan === 'true';
      const isGf = card.dataset.gf === 'true';

      // 1. Search filter
      const matchesSearch = !searchVal || name.includes(searchVal) || desc.includes(searchVal) || cat.includes(searchVal);

      // 2. Category filter
      let matchesCat = false;
      if (catFilter === 'all') matchesCat = true;
      else if (catFilter === 'starters' && cat.includes('starter')) matchesCat = true;
      else if ((catFilter === 'mains' || catFilter === 'main courses') && (cat.includes('main') || cat.includes('mains'))) matchesCat = true;
      else if (catFilter === 'desserts' && cat.includes('dessert')) matchesCat = true;
      else if (catFilter === 'drinks' && (cat.includes('drink') || cat.includes('beverage'))) matchesCat = true;

      // 3. Dietary filter
      let matchesDiet = true;
      if (activeDietPills.includes('vegetarian') && !isVeg) matchesDiet = false;
      if (activeDietPills.includes('vegan') && !isVegan) matchesDiet = false;
      if (activeDietPills.includes('gluten-free') && !isGf) matchesDiet = false;

      const show = matchesSearch && matchesCat && matchesDiet;
      card.classList.toggle('hidden', !show);
    });
  }

  function setupMenuInteractiveFilters() {
    // Category filter buttons
    qsa('.menu-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        qsa('.menu-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyMenuFilters();
      });
    });

    // Dietary filter pills
    qsa('.diet-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pill.classList.toggle('active');
        applyMenuFilters();
      });
    });

    // Live search input
    const searchInput = qs('#menu-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', applyMenuFilters);
    }
  }

  function setupCustomization() {
    qsa('.add-button').forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const card = button.closest('.menu-card');
        selectedDish = { id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price), description: card.dataset.description };
        qs('#modal-title').textContent = selectedDish.name;
        qs('.modal-description').textContent = selectedDish.description;
        const modal = qs('.modal-layer');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('locked');
      });
    });
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

  function setupResSlideshow() {
    const slides = qsa('.res-bg-slide');
    if (!slides.length) return;
    let index = 0;
    setInterval(() => {
      index = (index + 1) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
      });
    }, 4500);
  }

  function setupMenuSlideshow() {
    const slides = qsa('.menu-bg-slide');
    if (!slides.length) return;
    let index = 0;
    setInterval(() => {
      index = (index + 1) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
      });
    }, 4500);
  }

  function setupForms() {
    const reservationForm = qs('#reservation-form');
    reservationForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (!reservationForm.checkValidity()) { showMessage(reservationForm, 'Please fill in each required field.'); reservationForm.reportValidity(); return; }
      const data = new FormData(reservationForm);
      const name = data.get('name');
      const email = data.get('email');
      const date = data.get('date');
      const time = data.get('time');
      const party = data.get('party');
      const allergies = data.get('allergies') ? String(data.get('allergies')).trim() : '';
      const occasion = data.get('occasion') ? String(data.get('occasion')).trim() : '';
      const phone = '+233 503658302';

      const notesArr = [];
      if (allergies) notesArr.push(`Allergies: ${allergies}`);
      if (occasion) notesArr.push(`Occasion: ${occasion}`);

      const resPayload = {
        id: `reservation-${Date.now()}`,
        name,
        email,
        phone,
        date,
        time,
        party: party || '2 Guests',
        allergies,
        occasion,
        notes: notesArr.join(' | ') || 'Standard Table Reservation',
        status: 'pending'
      };

      const reservations = JSON.parse(localStorage.getItem('velvet-plate-reservations') || '[]');
      reservations.push(resPayload);
      localStorage.setItem('velvet-plate-reservations', JSON.stringify(reservations));
      
      // Post to backend API
      fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resPayload)
      }).catch(err => console.log('Backend API sync notice:', err));

      showMessage(reservationForm, `🎉 Table Requested! Thank you, ${name}. Your table for ${party} on ${date} at ${time} has been submitted. We look forward to welcoming you!`, true);
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

  function setupThemeToggle() {
    const header = qs('.site-header');
    if (header && !qs('.theme-toggle', header)) {
      const cartBtn = qs('.cart-trigger', header);
      const themeBtnHtml = `
        <button class="theme-toggle" type="button" aria-label="Toggle theme mode">
          <span class="theme-icon">☀️</span>
          <span class="theme-text">Light</span>
        </button>
      `;
      if (cartBtn) {
        cartBtn.insertAdjacentHTML('beforebegin', themeBtnHtml);
      } else {
        header.insertAdjacentHTML('beforeend', themeBtnHtml);
      }
    }

    const savedTheme = localStorage.getItem('velvet-plate-theme') || 'light';
    applyTheme(savedTheme);

    qsa('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('velvet-plate-theme', newTheme);
      });
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);

    qsa('.theme-toggle').forEach(btn => {
      const icon = qs('.theme-icon', btn);
      const text = qs('.theme-text', btn);
      if (icon) icon.textContent = isDark ? '🌙' : '☀️';
      if (text) text.textContent = isDark ? 'Dark' : 'Light';
    });
  }

  setupThemeToggle();
  setupNavigation();
  setupStaffAccess();
  renderDynamicMenu();
  setupMenuInteractiveFilters();
  applyMenuAvailability();
  setupCustomization();
  setupCheckout();
  setupForms();
  setupResSlideshow();
  setupMenuSlideshow();
  setupAboutSlideshow();
  renderCart();
  normalizeCurrencyLabels();

  function setupAboutSlideshow() {
    const slides = qsa('.about-bg-slide');
    if (!slides.length) return;
    let index = 0;
    setInterval(() => {
      index = (index + 1) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
      });
    }, 4500);
  }

  window.addEventListener('menu:updated', () => {
    renderDynamicMenu();
    applyMenuAvailability();
    setupCustomization();
  });
})();


