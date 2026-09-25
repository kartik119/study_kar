import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requirePermission } from '../middleware/auth';

const router: Router = Router();

// Ensure directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

/**
 * POST /api/v1/admin/upload/image
 * Accepts a single file uploaded under the field name 'image'
 */
router.post(
  '/image',
  requirePermission('subscriptions_payments.view' as any),
  upload.single('image'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { message: 'No file uploaded.' } });
      }

      // The URL that the frontend can use to load the image
      // Assuming `public` is served at the root (/) or we prefix it
      const fileUrl = `/uploads/images/${req.file.filename}`;

      return res.status(200).json({
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
