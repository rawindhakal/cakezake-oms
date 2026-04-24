const express = require('express');
const path = require('path');
const requireAuth = require('../middleware/auth');
const { upload, compressAndStore, useCloudinary } = require('../middleware/upload');

const router = express.Router();
router.use(requireAuth);

router.post('/image', upload.single('image'), compressAndStore, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const url = useCloudinary
      ? req.file.path
      : `/uploads/${req.file.filename}`;

    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
