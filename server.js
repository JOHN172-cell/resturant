const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4173;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory and db.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = {
  menu: [
    { id: 'carrots', name: 'Charred carrots', category: 'Starter', cuisine: 'Continental', price: 12, description: 'whipped feta, sumac, pistachio', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80' },
    { id: 'oysters', name: 'Ember oysters', category: 'Starter', cuisine: 'Continental', price: 18, description: 'cider mignonette, smoked chili', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80' },
    { id: 'chicken', name: 'Coal-roasted chicken', category: 'Main', cuisine: 'Continental', price: 28, description: 'preserved lemon, chicken jus', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80' },
    { id: 'steak', name: 'Hanger steak', category: 'Main', cuisine: 'Continental', price: 34, description: 'green peppercorn, crispy potato', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80' },
    { id: 'panna', name: 'Burnt honey panna cotta', category: 'Dessert', cuisine: 'Continental', price: 11, description: 'rhubarb, oat crumble', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=400&q=80' },
    { id: 'spritz', name: 'Salted grapefruit spritz', category: 'Drink', cuisine: 'Local drinks', price: 14, description: 'grapefruit, fino sherry, bubbles', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80' }
  ],
  availability: {
    carrots: true,
    oysters: true,
    chicken: true,
    steak: true,
    panna: true,
    spritz: true
  },
  orders: [],
  reservations: []
};

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading DB file:', err);
  }
  writeDB(defaultData);
  return defaultData;
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve the same public frontend directory used by Vercel's CDN.
app.use(express.static(path.join(__dirname, 'public')));

// --- API ENDPOINTS ---

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'Taste Africa Node Backend', timestamp: new Date().toISOString() });
});

// GET Menu Items
app.get('/api/menu', (req, res) => {
  const db = readDB();
  res.json(db.menu || []);
});

// POST Add or Update Menu Item
app.post('/api/menu', (req, res) => {
  const db = readDB();
  const newItem = req.body;
  if (!newItem || !newItem.id || !newItem.name) {
    return res.status(400).json({ error: 'Item must contain at least an id and a name' });
  }

  const existingIndex = db.menu.findIndex(item => item.id === newItem.id);
  if (existingIndex >= 0) {
    db.menu[existingIndex] = { ...db.menu[existingIndex], ...newItem };
  } else {
    db.menu.push(newItem);
  }
  if (db.availability[newItem.id] === undefined) {
    db.availability[newItem.id] = true;
  }
  writeDB(db);
  res.json({ success: true, item: newItem, menu: db.menu });
});

// DELETE Menu Item
app.delete('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.menu = db.menu.filter(item => item.id !== id);
  delete db.availability[id];
  writeDB(db);
  res.json({ success: true, id, menu: db.menu });
});

// GET Availability Map
app.get('/api/availability', (req, res) => {
  const db = readDB();
  res.json(db.availability || {});
});

// POST Toggle/Update Availability
app.post('/api/availability', (req, res) => {
  const db = readDB();
  const { id, available } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  db.availability[id] = available !== undefined ? Boolean(available) : !db.availability[id];
  writeDB(db);
  res.json({ success: true, availability: db.availability });
});

// GET Orders
app.get('/api/orders', (req, res) => {
  const db = readDB();
  res.json(db.orders || []);
});

// POST New Order
app.post('/api/orders', (req, res) => {
  const db = readDB();
  const isDelivery = req.body?.fulfillment?.method === 'delivery';
  const payment = req.body?.payment;
  if (isDelivery && (!payment?.method || payment.timing !== 'before-delivery')) {
    return res.status(400).json({ error: 'Delivery orders require payment before confirmation.' });
  }
  const newOrder = {
    id: `order-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'new',
    ...req.body
  };
  db.orders.push(newOrder);
  writeDB(db);
  res.json({ success: true, order: newOrder });
});

// PUT Update Order Status
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  order.status = status || order.status;
  writeDB(db);
  res.json({ success: true, order });
});

// DELETE Order
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.orders = db.orders.filter(o => o.id !== id);
  writeDB(db);
  res.json({ success: true, id });
});

// GET Reservations
app.get('/api/reservations', (req, res) => {
  const db = readDB();
  res.json(db.reservations || []);
});

// POST New Reservation
app.post('/api/reservations', (req, res) => {
  const db = readDB();
  const newReservation = {
    id: `reservation-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.reservations.push(newReservation);
  writeDB(db);
  res.json({ success: true, reservation: newReservation });
});

// PUT Update Reservation Status
app.put('/api/reservations/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = readDB();
  const reservation = db.reservations.find(r => r.id === id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

  reservation.status = status || reservation.status;
  writeDB(db);
  res.json({ success: true, reservation });
});

// Fallback to the public homepage for unknown SPA routes.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Taste Africa Express Backend server running on http://localhost:${PORT}`);
});
