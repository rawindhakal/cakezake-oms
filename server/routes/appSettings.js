const express     = require('express');
const AppSettings = require('../models/AppSettings');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const DEFAULTS = [
  { key: 'cake_flavors',    label: 'Cake Flavors',         values: ['Chocolate', 'Vanilla', 'Red Velvet', 'Butterscotch', 'Strawberry', 'Black Forest', 'Mango', 'Pineapple', 'Lemon', 'Caramel'] },
  { key: 'cake_sizes',      label: 'Cake Sizes / Weights', values: ['0.5 kg', '1 kg', '1.5 kg', '2 kg', '2.5 kg', '3 kg', '4 kg', '5 kg'] },
  { key: 'delivery_cities', label: 'Delivery Cities',      values: ['Birtamode', 'Damak', 'Dharan', 'Biratnagar', 'Itahari', 'Jhapa', 'Kathmandu', 'Ilam', 'Mechinagar', 'Other'] },
  { key: 'flower_types',    label: 'Flower Types',         values: ['Red Roses', 'Mixed Flowers', 'Sunflowers', 'Lilies', 'Orchids', 'Tulips', 'Gerbera', 'Carnations'] },
  { key: 'gift_types',      label: 'Gift Types',           values: ['Teddy Bear', 'Photo Frame', 'Mug', 'Cushion', 'Jewelry', 'Perfume', 'Watch', 'Wallet', 'Hamper'] },
];

const DEFAULT_MAP = {};
DEFAULTS.forEach((d) => { DEFAULT_MAP[d.key] = d; });

// GET /api/app-settings
router.get('/', async (req, res) => {
  try {
    const filter = req.tenantId ? { tenantId: req.tenantId } : { tenantId: { $exists: false } };
    const all    = await AppSettings.find(filter).lean();
    const map    = {};
    // Start with defaults, then override with saved values
    DEFAULTS.forEach((d) => { map[d.key] = { label: d.label, values: d.values }; });
    all.forEach((s) => { map[s.key] = { label: s.label, values: s.values }; });
    res.json({ success: true, settings: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/app-settings/:key
router.put('/:key', async (req, res) => {
  try {
    const { values } = req.body;
    if (!Array.isArray(values)) return res.status(400).json({ success: false, message: 'values must be an array' });

    const label = DEFAULT_MAP[req.params.key]?.label || req.params.key;
    const filter = req.tenantId
      ? { key: req.params.key, tenantId: req.tenantId }
      : { key: req.params.key, tenantId: { $exists: false } };

    const setting = await AppSettings.findOneAndUpdate(
      filter,
      { $set: { values: values.map((v) => String(v).trim()).filter(Boolean), label, tenantId: req.tenantId || undefined } },
      { new: true, upsert: true },
    );
    res.json({ success: true, setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
