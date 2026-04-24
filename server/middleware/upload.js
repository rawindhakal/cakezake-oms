const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ─── Compression ──────────────────────────────────────────────────────────────
// All uploads go through this: resize to max 1200px, convert to WebP @ quality 82.
// WebP is ~30% smaller than JPEG at equivalent visual quality.

async function compressBuffer(inputBuffer) {
  return sharp(inputBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

// ─── Multer — always memory storage so we can compress before saving ──────────

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB raw input limit; output will be much smaller
  fileFilter,
});

// ─── compressAndStore middleware ──────────────────────────────────────────────
// Run AFTER multer (upload.single / upload.array).
// Compresses req.file(s), then saves to Cloudinary or local disk.
// Sets req.file.path / req.file.filename / req.file.size as before.

async function storeOne(file) {
  const compressed = await compressBuffer(file.buffer);
  const filename   = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  if (useCloudinary) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'cakezake-orders', format: 'webp' },
        (err, res) => err ? reject(err) : resolve(res)
      );
      stream.end(compressed);
    });
    file.path     = result.secure_url;
    file.filename = result.public_id;
    file.size     = result.bytes;
  } else {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, compressed);
    file.path     = `/uploads/${filename}`;
    file.filename = filename;
    file.size     = compressed.length;
  }

  // Free memory
  delete file.buffer;
  return file;
}

async function compressAndStore(req, res, next) {
  try {
    if (req.file)  await storeOne(req.file);
    if (req.files) await Promise.all(req.files.map(storeOne));
    next();
  } catch (err) {
    next(err);
  }
}

if (!useCloudinary) {
  console.log('📁 Cloudinary not configured — using local file storage (uploads/)');
}

module.exports = { upload, compressAndStore, cloudinary, useCloudinary };
