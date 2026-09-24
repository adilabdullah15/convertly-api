// convertly-api — Image Converter & Compressor API
// Accepts an image upload and converts/compresses it with sharp.

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Limits & validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_WIDTH = 4000;
const VALID_FORMATS = new Set(['webp', 'png', 'jpeg']);
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
  'image/svg+xml',
  'image/bmp',
]);

const FORMAT_CONTENT_TYPES = {
  webp: 'image/webp',
  png: 'image/png',
  jpeg: 'image/jpeg',
};

// ---------- Middleware ----------

app.use(cors());
app.use(express.json());

// In-memory upload: the file buffer goes straight into sharp.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// ---------- Helpers ----------

/**
 * Validate and normalize the conversion parameters.
 * Reads from query string or multipart body (both are common with curl -F).
 * Returns { ok, params } or { ok: false, status, error }.
 */
function parseParams(req) {
  const src = { ...(req.query || {}), ...(req.body || {}) };

  const toRaw = (src.to ?? 'webp').toString().toLowerCase();
  if (!VALID_FORMATS.has(toRaw)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid "to" value "${src.to}". Supported formats: webp, png, jpeg.`,
    };
  }

  let width = null;
  if (src.width !== undefined && src.width !== '') {
    const w = Number(src.width);
    if (!Number.isInteger(w) || w < 1 || w > MAX_WIDTH) {
      return {
        ok: false,
        status: 400,
        error: `Invalid "width" value "${src.width}". Must be an integer between 1 and ${MAX_WIDTH}.`,
      };
    }
    width = w;
  }

  let quality = 80;
  if (src.quality !== undefined && src.quality !== '') {
    const q = Number(src.quality);
    if (!Number.isInteger(q) || q < 1 || q > 100) {
      return {
        ok: false,
        status: 400,
        error: `Invalid "quality" value "${src.quality}". Must be an integer between 1 and 100.`,
      };
    }
    quality = q;
  }

  return { ok: true, params: { to: toRaw, width, quality } };
}

// ---------- Routes ----------

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/convert', upload.single('image'), async (req, res, next) => {
  try {
    // No file uploaded under the expected field name.
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'No image uploaded. Attach a file in the "image" field.' });
    }

    // Reject non-image MIME types.
    if (!IMAGE_MIME_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type "${req.file.mimetype}". Only image files are accepted.`,
      });
    }

    // Validate conversion parameters.
    const parsed = parseParams(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ error: parsed.error });
    }
    const { to, width, quality } = parsed.params;

    // Build the sharp pipeline: optional resize, then encode.
    let pipeline = sharp(req.file.buffer);
    if (width !== null) {
      // Downscale/keep width, preserve aspect ratio, never enlarge.
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
    }
    pipeline = pipeline.toFormat(to, { quality });

    const outputBuffer = await pipeline.toBuffer();

    const extension = to === 'jpeg' ? 'jpg' : to;
    const baseName = (req.file.originalname || 'image')
      .replace(/\.[^.]*$/, '')
      .replace(/[^\w.-]+/g, '_') || 'image';

    res.set({
      'Content-Type': FORMAT_CONTENT_TYPES[to],
      'Content-Disposition': `attachment; filename="${baseName}.${extension}"`,
      'Content-Length': outputBuffer.length,
    });
    res.send(outputBuffer);
  } catch (err) {
    // sharp failed to decode or encode the image (corrupt/unsupported data).
    console.error('[convert] sharp processing failed:', err.message);
    return res.status(502).json({
      error: 'Failed to process the image. The file may be corrupt or in an unsupported format.',
    });
  }
});

// ---------- Error handling ----------

// Multer errors (file too large, malformed multipart) → 400.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10 MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
});

// Catch-all error handler.
app.use((err, req, res, _next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// 404 for unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.listen(PORT, () => {
  console.log(`convertly-api listening on http://localhost:${PORT}`);
});
