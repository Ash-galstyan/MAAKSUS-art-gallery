// backend/src/modules/uploads/multer.config.ts
/**
 * Multer disk storage. Files land in a tmp folder under UPLOAD_ROOT; the
 * image-processor moves them into their final locations after Sharp processes
 * them. Anything left in tmp longer than a day is safe to delete (cron job).
 */
import multer from 'multer';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import { env } from '../../config/env';

const TMP_DIR = path.join(env.UPLOAD_ROOT, '_tmp');

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(TMP_DIR, { recursive: true });
      cb(null, TMP_DIR);
    } catch (err) {
      cb(err as Error, TMP_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const imageUpload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
});
