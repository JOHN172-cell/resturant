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

  // --- Dynamic Food-Type Customization Engine ---
  function detectFoodType(dish) {
    const category = String(dish.category || '').toLowerCase();
    const cuisine = String(dish.cuisine || '').toLowerCase();
    const name = String(dish.name || '').toLowerCase();

    if (category.includes('drink') || category.includes('beverage') || cuisine.includes('drink') || cuisine.includes('cocktail') || name.includes('spritz') || name.includes('elixir') || name.includes('wine') || name.includes('juice') || name.includes('beverage')) {
      return 'drink';
    }
    if (category.includes('local dish') || cuisine.includes('local dish')) {
      return 'local';
    }
    if (category.includes('dessert') || category.includes('sweet') || cuisine.includes('patisserie') || name.includes('panna cotta') || name.includes('cake') || name.includes('ice cream') || name.includes('tart') || name.includes('chocolate') || name.includes('sweet')) {
      return 'dessert';
    }
    if (name.includes('steak') || name.includes('chicken') || name.includes('lamb') || name.includes('chops') || name.includes('beef') || cuisine.includes('steakhouse') || cuisine.includes('wood-fired')) {
      return 'steak';
    }
    if (name.includes('pizza') || name.includes('pasta') || name.includes('margherita') || name.includes('tagliatelle') || name.includes('spaghetti') || cuisine.includes('italian') || cuisine.includes('pasta')) {
      return 'pizza';
    }
    if (category.includes('starter') || category.includes('appetizer') || category.includes('salad') || name.includes('carrots') || name.includes('oysters') || name.includes('bruschetta')) {
      return 'starter';
    }
    return 'general';
  }

  function getFoodTypeSchema(foodType) {
    switch (foodType) {
      case 'drink':
        return {
          badgeTitle: 'Craft Beverage Order',
          badgeIcon: '🍹',
          themeClass: 'modal-type-drink',
          buttonText: 'Add Beverage to Order',
          isDrink: true,
          primary: {
            name: 'ice',
            heading: 'Ice Preference',
            options: ['Regular Ice', 'Light Ice', 'Extra Ice', 'No Ice'],
            defaultVal: 'Regular Ice'
          },
          secondary: {
            name: 'sweetness',
            heading: 'Sweetness & Flavor',
            options: ['Standard Sweetness', '50% Less Sweet', 'Extra Sweet', 'Unsweetened'],
            defaultVal: 'Standard Sweetness'
          },
          extras: [
            { label: 'Fresh Lime Wheel', cost: 1.00 },
            { label: 'Sparkling Soda Splash', cost: 1.00 },
            { label: 'Fresh Mint Sprig', cost: 1.00 },
            { label: 'Double Shot / Premium', cost: 5.00 }
          ],
          noteLabel: 'Special instructions for the bartender'
        };

      case 'dessert':
        return {
          badgeTitle: 'Sweet Treat Order',
          badgeIcon: '🍰',
          themeClass: 'modal-type-dessert',
          buttonText: 'Add Sweet Treat to Order',
          hasPortionSelector: true,
          primary: {
            name: 'temp',
            heading: 'Serving Temperature',
            options: ['Chilled', 'Room Temp', 'Warm & Heated'],
            defaultVal: 'Chilled'
          },
          secondary: {
            name: 'dairy',
            heading: 'Milk & Cream Choice',
            options: ['Traditional Dairy', 'Oat Milk / Dairy-Free (+₵2.00)'],
            defaultVal: 'Traditional Dairy'
          },
          extras: [
            { label: 'Vanilla Bean Ice Cream Scoop', cost: 4.00 },
            { label: 'Valrhona Dark Drizzle', cost: 2.50 },
            { label: 'Crushed Pistachio Crumble', cost: 2.00 },
            { label: 'Fresh Berry Reduction', cost: 3.00 }
          ],
          noteLabel: 'Special requests for our pastry chef'
        };

      case 'steak':
        return {
          badgeTitle: 'Wood-Fired Grill Order',
          badgeIcon: '🥩',
          themeClass: 'modal-type-steak',
          buttonText: 'Add Grill Special to Order',
          hasPortionSelector: true,
          primary: {
            name: 'doneness',
            heading: 'Meat Cooking Temperature',
            options: ['Medium Rare', 'Rare', 'Medium', 'Medium Well', 'Well Done'],
            defaultVal: 'Medium Rare'
          },
          secondary: {
            name: 'sauce',
            heading: 'Signature Sauce',
            options: ['Peppercorn Jus', 'Smoked Chili Butter', 'Garlic Herb Butter', 'Chimichurri'],
            defaultVal: 'Peppercorn Jus'
          },
          extras: [
            { label: 'Triple-Cooked Garlic Potatoes', cost: 4.00 },
            { label: 'Ember Roasted Asparagus', cost: 5.00 },
            { label: 'Black Truffle Butter', cost: 3.00 },
            { label: 'Extra Peppercorn Jus', cost: 2.00 }
          ],
          noteLabel: 'Special preparation or sear requests'
        };

      case 'pizza':
        return {
          badgeTitle: 'Artisan Kitchen Order',
          badgeIcon: '🍕',
          themeClass: 'modal-type-pizza',
          buttonText: 'Add Artisan Dish to Order',
          hasPortionSelector: true,
          primary: {
            name: 'crust',
            heading: 'Crust / Base Preference',
            options: ['Traditional Neapolitan', 'Thin & Crispy', 'Gluten-Free Base (+₵4.00)'],
            defaultVal: 'Traditional Neapolitan'
          },
          secondary: {
            name: 'spice',
            heading: 'Sauce & Spice Intensity',
            options: ['Mild Marinara', 'Garlic & Herb', 'Spicy Chili Oil'],
            defaultVal: 'Mild Marinara'
          },
          extras: [
            { label: 'Extra Fior di Latte Cheese', cost: 4.00 },
            { label: 'Black Truffle Oil Drizzle', cost: 3.00 },
            { label: 'Fresh Basil & Olive Oil', cost: 1.50 },
            { label: 'Aged Parmesan Shavings', cost: 2.50 }
          ],
          noteLabel: 'Special crust or topping requests'
        };

      case 'local':
        return {
          badgeTitle: 'Local Dish Order',
          badgeIcon: '🍲',
          themeClass: 'modal-type-starter',
          buttonText: 'Add Local Dish to Order',
          hasPortionSelector: true,
          noteLabel: ''
        };

      case 'starter':
      default:
        return {
          badgeTitle: 'Starter & Shareable Order',
          badgeIcon: '🥗',
          themeClass: 'modal-type-starter',
          buttonText: 'Add Starter to Order',
          hasPortionSelector: true,
          primary: {
            name: 'dressing',
            heading: 'Serving & Dressing Style',
            options: ['Chef House Vinaigrette', 'Creamy Feta & Sumac', 'Sumac Olive Oil', 'Dressing on Side'],
            defaultVal: 'Chef House Vinaigrette'
          },
          secondary: {
            name: 'prep',
            heading: 'Dietary Preparation',
            options: ['Standard Chef Prep', 'Make it Vegan 🌱', 'Gluten-Free Prep'],
            defaultVal: 'Standard Chef Prep'
          },
          extras: [
            { label: 'Warm Artisan Sourdough', cost: 3.00 },
            { label: 'Roasted Pistachios', cost: 2.00 },
            { label: 'Extra Whipped Feta', cost: 3.50 }
          ],
          noteLabel: 'Dietary exclusions or kitchen notes'
        };
    }
  }

  function ensureModalDOM() {
    if (qs('.modal-layer')) return;
    const modalHtml = `
      <div class="modal-layer" aria-hidden="true">
        <section class="custom-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button class="modal-close" type="button" aria-label="Close customization">×</button>
          <div class="modal-image modal-image-1"></div>
          <div class="modal-content">
            <div class="modal-type-badge" id="modal-type-badge">
              <span class="badge-icon">🍽️</span>
              <span class="badge-text">Kitchen Customizer</span>
            </div>
            <p class="eyebrow">Crafted for your taste</p>
            <h2 id="modal-title">Dish name</h2>
            <p class="modal-description"></p>
            <div id="dynamic-modal-options" class="modal-dynamic-options"></div>
            <button class="button button-dark modal-add" type="button">Add to order <span>+</span></button>
          </div>
        </section>
      </div>
      <div class="checkout-layer" aria-hidden="true">
        <section class="checkout-modal" role="dialog" aria-modal="true">
          <button class="modal-close checkout-close" type="button" aria-label="Close checkout">×</button>
          <span class="success-symbol">✓</span>
          <p class="eyebrow">Order received</p>
          <h2>That’s dinner sorted.</h2>
          <p>Your order is on its way to the kitchen. We’ll see you at Taste Africa.</p>
          <button class="button button-dark checkout-done" type="button">Back to the menu <span>↗</span></button>
        </section>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setupCheckout();
  }

  function openDishModal(dish) {
    if (!dish) return;
    ensureModalDOM();
    selectedDish = dish;
    renderCustomizationModal(selectedDish);

    const modal = qs('.modal-layer');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('locked');
    }
  }

  function setupCustomization() {
    ensureModalDOM();
    const allItems = loadMenuItems();

    // 1. Menu Page Cards (.menu-card)
    qsa('.menu-card').forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = 'true';
      card.style.cursor = 'pointer';

      card.addEventListener('click', event => {
        const dishId = card.dataset.id;
        const found = allItems.find(i => String(i.id) === String(dishId));
        const bgImg = card.querySelector('.menu-image')?.style.backgroundImage;
        let imgUrl = '';
        if (bgImg && bgImg.includes('url')) {
          imgUrl = bgImg.slice(5, -2).replace(/['"]/g, '');
        }

        const dish = found || {
          id: card.dataset.id || `dish-${Date.now()}`,
          name: card.dataset.name || card.querySelector('h2')?.textContent || 'Menu Item',
          price: Number(card.dataset.price) || 20,
          description: card.dataset.description || card.querySelector('p')?.textContent || '',
          category: card.dataset.category || '',
          cuisine: card.dataset.cuisine || card.querySelector('.card-category')?.textContent || '',
          image: imgUrl
        };
        openDishModal(dish);
      });
    });

    // 2. Home Page / Featured Cards (.dish-card)
    qsa('.dish-card').forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = 'true';
      card.style.cursor = 'pointer';

      card.addEventListener('click', () => {
        const title = card.querySelector('h3')?.innerText.replace(/\n/g, ' ') || 'Featured Dish';
        const categoryText = card.querySelector('.dish-meta span')?.textContent || '';
        const bgImg = card.querySelector('.dish-image')?.style.backgroundImage;
        let imgUrl = '';
        if (bgImg && bgImg.includes('url')) {
          imgUrl = bgImg.slice(5, -2).replace(/['"]/g, '');
        }

        const found = allItems.find(i => 
          i.name.toLowerCase().includes(title.toLowerCase().split(' ')[0]) || 
          title.toLowerCase().includes(i.name.toLowerCase().split(' ')[0])
        );

        const dish = found || {
          id: `featured-${Date.now()}`,
          name: title,
          price: 28.00,
          description: card.querySelector('.dish-meta p')?.textContent || 'Chef wood-fired featured dish.',
          category: categoryText.includes('Starter') ? 'Starter' : categoryText.includes('Sweet') ? 'Dessert' : 'Main',
          cuisine: 'Wood-Fired',
          image: imgUrl
        };
        openDishModal(dish);
      });
    });

    qsa('.modal-close').forEach(button => button.addEventListener('click', closeModal));
    qs('.modal-layer')?.addEventListener('click', event => { if (event.target.classList.contains('modal-layer')) closeModal(); });
    const addBtn = qs('.modal-add');
    if (addBtn) {
      addBtn.onclick = addCustomizedItem;
    }
  }

  function renderCustomizationModal(dish) {
    const foodType = detectFoodType(dish);
    const schema = getFoodTypeSchema(foodType);
    selectedDish.foodType = foodType;
    selectedDish.schema = schema;

    const modalSection = qs('.custom-modal');
    if (modalSection) {
      modalSection.className = `custom-modal ${schema.themeClass}`;
    }

    // Dynamic Image Update on Order Form
    const modalImage = qs('.modal-image');
    if (modalImage) {
      const fallbacks = {
        drink: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
        dessert: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
        steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        pizza: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
        starter: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80'
      };
      const displayImg = dish.image || fallbacks[foodType] || fallbacks.starter;
      modalImage.style.backgroundImage = `url('${displayImg}')`;
    }

    const badgeEl = qs('#modal-type-badge');
    if (badgeEl) {
      badgeEl.querySelector('.badge-icon').textContent = schema.badgeIcon;
      badgeEl.querySelector('.badge-text').textContent = schema.badgeTitle;
    }

    const titleEl = qs('#modal-title');
    if (titleEl) {
      titleEl.innerHTML = `${dish.name} <span style="font-size:22px; color:var(--tomato); margin-left:12px; font-weight:700;">₵${Number(dish.price).toFixed(2)}</span>`;
    }

    const descEl = qs('.modal-description');
    if (descEl) descEl.textContent = dish.description || 'Freshly prepared wood-fired culinary dish';

    const addBtn = qs('.modal-add');
    if (addBtn) addBtn.innerHTML = `${schema.buttonText} <span>+</span>`;

    const optionsContainer = qs('#dynamic-modal-options');
    if (!optionsContainer) return;

    let html = '';

    // Drink Specific: Serving Unit & Quantity Stepper (Glasses vs Bottles)
    if (schema.isDrink) {
      const basePrice = Number(dish.price) || 18;
      const bottlePrice = (basePrice * 3.2).toFixed(2);

      html += `
        <div class="custom-option-section drink-serving-section">
          <div class="option-heading-styled">
            <span class="opt-num">01</span>
            <strong>Choose Serving Unit & Count</strong>
          </div>
          <div class="custom-pill-group drink-unit-pills">
            <label class="custom-pill-label">
              <input type="radio" name="drink-serving-unit" value="glass" checked data-multiplier="1.0" data-unit="Glass" data-plural="Glasses">
              <span class="pill-btn">By the Glass 🥂 <span class="pill-cost">₵${basePrice.toFixed(2)}</span></span>
            </label>
            <label class="custom-pill-label">
              <input type="radio" name="drink-serving-unit" value="bottle" data-multiplier="3.2" data-unit="Bottle" data-plural="Bottles">
              <span class="pill-btn">Full Bottle 🍾 <span class="pill-cost">₵${bottlePrice}</span></span>
            </label>
          </div>
          <div class="drink-quantity-stepper">
            <span class="stepper-label">Number of <strong id="drink-unit-name-display">Glasses</strong>:</span>
            <div class="stepper-controls">
              <button type="button" class="stepper-btn" id="drink-qty-minus" aria-label="Decrease count">−</button>
              <input type="number" id="drink-serving-count" value="1" min="1" max="20" readonly>
              <button type="button" class="stepper-btn" id="drink-qty-plus" aria-label="Increase count">+</button>
            </div>
            <span class="stepper-subtotal" id="drink-calculated-total">Total: ₵${basePrice.toFixed(2)}</span>
          </div>
        </div>
      `;
    }

    // Food portions: every food item is ordered by portion. Local dishes use
    // this as their only customisation step.
    if (schema.hasPortionSelector) {
      html += `
        <div class="custom-option-section drink-serving-section food-portion-section">
          <div class="option-heading-styled">
            <span class="opt-num">01</span>
            <strong>Number of Portions</strong>
          </div>
          <div class="drink-quantity-stepper">
            <span class="stepper-label">Portions:</span>
            <div class="stepper-controls">
              <button type="button" class="stepper-btn" id="food-portion-minus" aria-label="Decrease portions">−</button>
              <input type="number" id="food-portion-count" value="1" min="1" max="20" readonly>
              <button type="button" class="stepper-btn" id="food-portion-plus" aria-label="Increase portions">+</button>
            </div>
          </div>
        </div>
      `;
    }

    // Primary Radio Option Group
    if (schema.primary) {
      const stepNum = schema.isDrink ? '02' : (schema.hasPortionSelector ? '02' : '01');
      html += `
        <div class="custom-option-section">
          <div class="option-heading-styled">
            <span class="opt-num">${stepNum}</span>
            <strong>${schema.primary.heading}</strong>
          </div>
          <div class="custom-pill-group">
            ${schema.primary.options.map((opt, i) => `
              <label class="custom-pill-label">
                <input type="radio" name="modal-primary-opt" value="${opt}" ${i === 0 ? 'checked' : ''}>
                <span class="pill-btn">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Secondary Radio Option Group
    if (schema.secondary) {
      const stepNum = schema.isDrink ? '03' : (schema.hasPortionSelector ? '03' : '02');
      html += `
        <div class="custom-option-section">
          <div class="option-heading-styled">
            <span class="opt-num">${stepNum}</span>
            <strong>${schema.secondary.heading}</strong>
          </div>
          <div class="custom-pill-group">
            ${schema.secondary.options.map((opt, i) => `
              <label class="custom-pill-label">
                <input type="radio" name="modal-secondary-opt" value="${opt}" ${i === 0 ? 'checked' : ''}>
                <span class="pill-btn">${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Extras Checkbox Group
    if (schema.extras && schema.extras.length) {
      const stepNum = schema.isDrink ? '04' : (schema.hasPortionSelector ? '04' : '03');
      html += `
        <div class="custom-option-section">
          <div class="option-heading-styled">
            <span class="opt-num">${stepNum}</span>
            <strong>Add Gourmet Extras</strong>
          </div>
          <div class="custom-pill-group">
            ${schema.extras.map(extra => `
              <label class="custom-pill-label">
                <input type="checkbox" name="modal-extra-opt" value="${extra.label}" data-cost="${extra.cost}">
                <span class="pill-btn">
                  ${extra.label} <span class="pill-cost">+₵${extra.cost.toFixed(2)}</span>
                </span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Local dishes only ask for portions; other item types can include a note.
    if (schema.noteLabel) {
      html += `
        <label class="custom-note-field">
          <span>${schema.noteLabel}</span>
          <input type="text" id="modal-note-input" placeholder="e.g. extra cold, on the rocks, allergies...">
        </label>
      `;
    }

    optionsContainer.innerHTML = html;

    // Attach Interactive Drink Stepper & Live Price Calculations
    if (schema.isDrink) {
      const basePrice = Number(dish.price) || 18;
      const unitRadios = qsa('input[name="drink-serving-unit"]');
      const countInput = qs('#drink-serving-count');
      const minusBtn = qs('#drink-qty-minus');
      const plusBtn = qs('#drink-qty-plus');
      const unitDisplay = qs('#drink-unit-name-display');
      const subtotalEl = qs('#drink-calculated-total');

      function updateDrinkCalculations() {
        const selectedRadio = qs('input[name="drink-serving-unit"]:checked');
        const multiplier = Number(selectedRadio?.dataset.multiplier || 1.0);
        const unitPlural = selectedRadio?.dataset.plural || 'Glasses';
        const count = Math.max(1, Number(countInput?.value || 1));

        if (unitDisplay) unitDisplay.textContent = unitPlural;

        let extraCost = 0;
        qsa('input[name="modal-extra-opt"]:checked').forEach(chk => {
          extraCost += Number(chk.dataset.cost || 0);
        });

        const singleUnitPrice = basePrice * multiplier;
        const total = (singleUnitPrice * count) + extraCost;

        if (subtotalEl) subtotalEl.textContent = `Total: ₵${total.toFixed(2)}`;
        if (titleEl) {
          titleEl.innerHTML = `${dish.name} <span style="font-size:22px; color:var(--tomato); margin-left:12px; font-weight:700;">₵${total.toFixed(2)}</span>`;
        }
      }

      unitRadios.forEach(r => r.addEventListener('change', updateDrinkCalculations));
      minusBtn?.addEventListener('click', () => {
        let val = Number(countInput.value || 1);
        if (val > 1) { countInput.value = val - 1; updateDrinkCalculations(); }
      });
      plusBtn?.addEventListener('click', () => {
        let val = Number(countInput.value || 1);
        if (val < 20) { countInput.value = val + 1; updateDrinkCalculations(); }
      });
      qsa('input[name="modal-extra-opt"]').forEach(chk => chk.addEventListener('change', updateDrinkCalculations));
    }

    if (schema.hasPortionSelector) {
      const portionInput = qs('#food-portion-count');
      qs('#food-portion-minus')?.addEventListener('click', () => {
        const value = Number(portionInput?.value || 1);
        if (value > 1 && portionInput) portionInput.value = value - 1;
      });
      qs('#food-portion-plus')?.addEventListener('click', () => {
        const value = Number(portionInput?.value || 1);
        if (value < 20 && portionInput) portionInput.value = value + 1;
      });
    }
  }

  function closeModal() {
    const modal = qs('.modal-layer');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
  }

  function addCustomizedItem() {
    if (!selectedDish) return;
    const foodType = selectedDish.foodType || detectFoodType(selectedDish);
    const schema = selectedDish.schema || getFoodTypeSchema(foodType);

    const primaryChoice = qs('input[name="modal-primary-opt"]:checked')?.value || '';
    const secondaryChoice = qs('input[name="modal-secondary-opt"]:checked')?.value || '';

    const checkedExtras = qsa('input[name="modal-extra-opt"]:checked');
    const extraLabels = [];
    let extraCost = 0;

    // Check for price additions in radios (e.g. +₵4.00, +₵2.00)
    [primaryChoice, secondaryChoice].forEach(choice => {
      const match = choice.match(/\+₵(\d+(\.\d+)?)/);
      if (match) extraCost += Number(match[1]);
    });

    checkedExtras.forEach(input => {
      extraLabels.push(input.value);
      extraCost += Number(input.dataset.cost || 0);
    });

    const notes = qs('#modal-note-input')?.value.trim() || '';

    let itemQuantity = 1;
    let itemPrice = selectedDish.price + extraCost;
    const parts = [];

    if (schema.isDrink) {
      const selectedUnitRadio = qs('input[name="drink-serving-unit"]:checked');
      const unitType = selectedUnitRadio?.value || 'glass';
      const multiplier = Number(selectedUnitRadio?.dataset.multiplier || 1.0);
      const drinkCount = Math.max(1, Number(qs('#drink-serving-count')?.value || 1));

      const unitName = unitType === 'bottle' 
        ? (drinkCount > 1 ? `${drinkCount} Bottles (750ml)` : '1 Bottle (750ml)') 
        : (drinkCount > 1 ? `${drinkCount} Glasses` : '1 Glass');

      parts.push(`Portion: ${unitName}`);
      itemPrice = (selectedDish.price * multiplier) + extraCost;
      itemQuantity = drinkCount;
    }

    if (schema.hasPortionSelector) {
      const portionCount = Math.max(1, Number(qs('#food-portion-count')?.value || 1));
      parts.push(`Portions: ${portionCount}`);
      itemQuantity = portionCount;
    }

    if (primaryChoice) parts.push(primaryChoice);
    if (secondaryChoice) parts.push(secondaryChoice);
    if (extraLabels.length) parts.push(`+ ${extraLabels.join(', ')}`);
    if (notes) parts.push(`Note: ${notes}`);

    const customSummary = parts.join(' · ');

    const item = {
      ...selectedDish,
      foodType,
      primaryChoice,
      secondaryChoice,
      extras: extraLabels,
      notes,
      customSummary,
      price: itemPrice,
      quantity: itemQuantity
    };

    const match = cart.find(entry => 
      entry.id === item.id && 
      entry.customSummary === item.customSummary &&
      entry.price === item.price
    );

    if (match) {
      match.quantity += itemQuantity;
    } else {
      cart.push(item);
    }

    saveCart();
    closeModal();
    openCart();
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

    items.innerHTML = cart.map((item, index) => {
      const summaryText = item.customSummary || [
        item.vegan ? 'Vegan' : null,
        item.spice,
        item.extras && item.extras.length ? `+ ${item.extras.join(', ')}` : null,
        item.exclusions ? `No: ${item.exclusions}` : null
      ].filter(Boolean).join(' · ') || 'Standard Prep';

      return `
        <article class="cart-line">
          <div>
            <h3>${item.name}</h3>
            <p>${summaryText}</p>
          </div>
          <strong>${money(item.price * item.quantity)}</strong>
          <div class="cart-controls">
            <button type="button" data-action="decrease" data-index="${index}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" data-index="${index}" aria-label="Increase quantity">+</button>
            <button class="remove-item" type="button" data-action="remove" data-index="${index}" aria-label="Remove item">×</button>
          </div>
        </article>
      `;
    }).join('');

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


