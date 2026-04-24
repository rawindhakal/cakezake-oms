const express = require('express');
const AppSettings = require('../models/AppSettings');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const DEFAULTS = [
  {
    key: 'cake_flavors', label: 'Cake Flavors',
    values: ['Chocolate', 'Vanilla', 'Red Velvet', 'Butterscotch', 'Strawberry', 'Black Forest', 'Mango', 'Pineapple', 'Lemon', 'Caramel'],
  },
  {
    key: 'cake_sizes', label: 'Cake Sizes / Weights',
    values: ['0.5 kg', '1 kg', '1.5 kg', '2 kg', '2.5 kg', '3 kg', '4 kg', '5 kg'],
  },
  {
    key: 'delivery_cities', label: 'Delivery Cities',
    values: ['Birtamode', 'Damak', 'Dharan', 'Biratnagar', 'Itahari', 'Jhapa', 'Kathmandu', 'Ilam', 'Mechinagar', 'Other'],
  },
  {
    key: 'flower_types', label: 'Flower Types',
    values: ['Red Roses', 'Mixed Flowers', 'Sunflowers', 'Lilies', 'Orchids', 'Tulips', 'Gerbera', 'Carnations'],
  },
  {
    key: 'gift_types', label: 'Gift Types',
    values: ['Teddy Bear', 'Photo Frame', 'Mug', 'Cushion', 'Jewelry', 'Perfume', 'Watch', 'Wallet', 'Hamper'],
  },
];

async function seedDefaults() {
  for (const def of DEFAULTS) {
    await AppSettings.findOneAndUpdate(
      { key: def.key },
      { $setOnInsert: { label: def.label, values: def.values } },
      { upsert: true },
    );
  }
}
seedDefaults().catch(console.error);

// GET /api/app-settings  → all settings as flat object { key: values[] }
router.get('/', async (req, res) => {
  try {
    const all = await AppSettings.find().lean();
    const map = {};
    all.forEach((s) => { map[s.key] = { label: s.label, values: s.values }; });
    res.json({ success: true, settings: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/app-settings/:key  { values: [...] }
router.put('/:key', async (req, res) => {
  try {
    const { values } = req.body;
    if (!Array.isArray(values)) return res.status(400).json({ success: false, message: 'values must be an array' });

    const setting = await AppSettings.findOneAndUpdate(
      { key: req.params.key },
      { values: values.map((v) => String(v).trim()).filter(Boolean) },
      { new: true, upsert: true },
    );
    res.json({ success: true, setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
