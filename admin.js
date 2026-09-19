(function () {
  'use strict';

  const reservationsKey = 'velvet-plate-reservations';
  const menuKey = 'velvet-plate-availability';
  const menuDataKey = 'velvet-plate-menu-data';
  const serviceKey = 'velvet-plate-service-active';
  const adminUsername = 'admin123';
  const adminPassword = 'admin123';
  const cloudinaryConfig = {
    cloudName: '',
    uploadPreset: ''
  };
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

  let reservations = JSON.parse(localStorage.getItem(reservationsKey) || '[]');
  let menuItems = loadMenuItems();
  let availability = loadAvailability();
  let menuSearch = '';

  function loadMenuItems() {
    const stored = JSON.parse(localStorage.getItem(menuDataKey) || 'null');
    if (!Array.isArray(stored) || !stored.length) {
      localStorage.setItem(menuDataKey, JSON.stringify(defaultMenuItems));
      return [...defaultMenuItems];
    }
    return stored.map(item => ({
      id: String(item.id || slugify(item.name || 'dish')),
      name: String(item.name || 'Untitled dish'),
      category: String(item.category || 'Starter'),
      cuisine: String(item.cuisine || 'Continental'),
      price: Number(item.price) || 0,
      description: String(item.description || ''),
      image: String(item.image || ''),
      images: Array.isArray(item.images) ? item.images.map(String) : (item.image ? [String(item.image)] : [])
    }));
  }

  function loadAvailability() {
    const state = JSON.parse(localStorage.getItem(menuKey) || '{}');
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
    const cart = JSON.parse(localStorage.getItem('velvet-plate-cart') || '[]');
    const ordersStat = qs('#orders-stat');
    const menuStat = qs('#menu-stat');
    if (ordersStat) ordersStat.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (menuStat) menuStat.textContent = menuItems.filter(item => availability[item.id] !== false).length;
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
      const haystack = `${item.name} ${item.cuisine} ${item.category} ${item.description}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const fallbackImages = {
      Starter: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=240&q=80',
      Main: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=240&q=80',
      Dessert: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=240&q=80',
      Drink: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=240&q=80'
    };
    qs('#admin-menu-list').innerHTML = matchingItems.map(item => {
      const isAvailable = availability[item.id] !== false;
      const image = item.image || item.images?.[0] || fallbackImages[item.category] || fallbackImages.Main;
      return `<div class="admin-menu-item"><div class="admin-menu-thumb" role="img" aria-label="${item.name} preview" style="background-image:url('${image}')"></div><div><strong>${item.name}</strong><p>${item.cuisine} / ${item.category} / ${money(item.price)}</p></div><div class="admin-menu-actions"><button type="button" class="availability-toggle ${isAvailable ? 'available' : ''}" aria-label="${isAvailable ? 'Make unavailable' : 'Make available'} ${item.name}" data-menu-id="${item.id}" aria-pressed="${isAvailable}"><span>${isAvailable ? 'Available' : 'Unavailable'}</span></button><button type="button" class="delete-menu-item" aria-label="Delete ${item.name}" data-delete-menu-id="${item.id}">Delete</button></div></div>`;
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
    qsa('[data-delete-menu-id]').forEach(button => button.addEventListener('click', () => deleteMenuItem(button.dataset.deleteMenuId)));
  }

  function deleteMenuItem(id) {
    const item = menuItems.find(entry => entry.id === id);
    if (!item || !window.confirm(`Delete ${item.name} from the menu?`)) return;
    menuItems = menuItems.filter(entry => entry.id !== id);
    delete availability[id];
    localStorage.setItem(menuDataKey, JSON.stringify(menuItems));
    localStorage.setItem(menuKey, JSON.stringify(availability));
    renderMenu();
    renderStats();
    window.dispatchEvent(new CustomEvent('menu:updated'));
  }

  async function uploadImageToCloudinary(file) {
    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
      throw new Error('Add your Cloudinary cloud name and unsigned upload preset in admin.js first.');
    }
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      throw new Error('Each picture must be an image smaller than 10MB.');
    }
    const body = new FormData();
    body.append('file', file);
    body.append('upload_preset', cloudinaryConfig.uploadPreset);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: 'POST', body });
    if (!response.ok) throw new Error('Cloudinary could not upload one of the pictures.');
    const result = await response.json();
    return result.secure_url;
  }

  async function uploadSelectedImages(files) {
    const selectedFiles = [...files];
    if (selectedFiles.length < 3) throw new Error('Please choose at least 3 pictures for this dish.');
    return Promise.all(selectedFiles.map(uploadImageToCloudinary));
  }

  async function addMenuItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || 'Starter');
    const cuisine = String(formData.get('cuisine') || 'Continental');
    const price = Number(formData.get('price'));
    const imageFiles = formData.getAll('images').filter(file => file.size);

    if (!name || !Number.isFinite(price) || price <= 0) {
      return;
    }

    let images = [];
    try {
      images = await uploadSelectedImages(imageFiles);
    } catch (error) {
      window.alert(error.message);
      return;
    }

    const item = {
      id: slugify(name),
      name,
      category,
      cuisine,
      price,
      description: `${cuisine} ${category.toLowerCase()} special`,
      image: images[0] || '',
      images
    };

    const existingIndex = menuItems.findIndex(entry => entry.id === item.id || entry.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      if (!images.length) {
        item.image = menuItems[existingIndex].image || '';
        item.images = menuItems[existingIndex].images || [];
      }
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
    closeAddItemModal();
  }

  function closeAddItemModal() {
    const modal = qs('#add-item-modal');
    const trigger = qs('#open-add-item');
    if (!modal) return;
    modal.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
  }

  function setupAddItemModal() {
    const modal = qs('#add-item-modal');
    const trigger = qs('#open-add-item');
    const closeButton = qs('#close-add-item');
    if (!modal || !trigger) return;

    trigger.addEventListener('click', () => {
      modal.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      qs('#add-menu-form input[name="name"]')?.focus();
    });
    closeButton?.addEventListener('click', closeAddItemModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeAddItemModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) closeAddItemModal();
    });
  }

  function setupDishStyleOptions() {
    const categoryField = qs('#dish-category');
    const styleField = qs('select[name="cuisine"]');
    if (!categoryField || !styleField) return;

    const updateStyleOptions = () => {
      const isDrink = categoryField.value === 'Drink';
      qsa('[data-drink-style]', styleField).forEach(option => {
        option.hidden = !isDrink;
      });
      qsa('[data-food-style]', styleField).forEach(option => {
        option.hidden = isDrink;
      });
      const validFoodStyle = ['Continental', 'Fast food', 'Local dish'].includes(styleField.value);
      const validDrinkStyle = qsa('[data-drink-style]', styleField).some(option => option.value === styleField.value);
      if ((isDrink && !validDrinkStyle) || (!isDrink && !validFoodStyle)) {
        styleField.value = isDrink ? 'Local drinks' : 'Continental';
      }
      if (!isDrink && styleField.value !== 'Continental' && styleField.value !== 'Fast food' && styleField.value !== 'Local dish') {
        styleField.value = 'Continental';
      }
    };

    categoryField.addEventListener('change', updateStyleOptions);
    updateStyleOptions();
  }

  function setupServiceToggle() {
    const toggle = qs('#service-toggle');
    const label = qs('#service-toggle-label');
    const dot = qs('#service-status-dot');
    const copy = qs('#service-status-copy');
    const time = qs('#service-status-time');
    if (!toggle) return;

    const update = active => {
      toggle.classList.toggle('is-on', active);
      toggle.setAttribute('aria-pressed', String(active));
      if (label) label.textContent = active ? 'Service on' : 'Service off';
      dot?.classList.toggle('live', active);
      if (copy) copy.textContent = active ? 'Live and visible to guests' : 'Service paused for guests';
      if (time) time.textContent = active ? 'LIVE' : 'PAUSED';
    };

    let active = localStorage.getItem(serviceKey) !== 'false';
    update(active);
    toggle.addEventListener('click', () => {
      active = !active;
      localStorage.setItem(serviceKey, String(active));
      update(active);
    });
  }

  function renderOrders() {
    const orders = JSON.parse(localStorage.getItem('velvet-plate-cart') || '[]');
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

    if (sessionStorage.getItem('velvet-plate-admin-auth') === 'true') {
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

  function startSlideshow(selector) {
    const slides = qsa(selector);
    let currentSlideIndex = 0;
    if (!slides.length) return;
    setInterval(() => {
      currentSlideIndex = (currentSlideIndex + 1) % slides.length;
      slides.forEach((slide, index) => slide.classList.toggle('is-active', index === currentSlideIndex));
    }, 5000);
  }

  startSlideshow('.admin-login-slide');
  startSlideshow('.admin-dashboard-slide');

  const menuSearchInput = qs('#menu-search');
  menuSearchInput?.addEventListener('input', event => {
    menuSearch = event.target.value;
    renderMenu();
  });

  qs('#add-menu-form')?.addEventListener('submit', addMenuItem);
  setupAddItemModal();
  setupDishStyleOptions();
  setupServiceToggle();

  qs('#admin-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  setupAuth();
  renderStats();
  renderMenu();
  renderOrders();
  setupFilters();
})();
