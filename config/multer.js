const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['avatars', 'attachments', 'reports', 'signatures'];
const baseDir = process.env.UPLOAD_PATH || './uploads';

uploadDirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destFolder = 'attachments';
    
    if (file.fieldname === 'avatar') {
      destFolder = 'avatars';
    } else if (file.fieldname === 'report') {
      destFolder = 'reports';
    } else if (file.fieldname === 'signature') {
      destFolder = 'signatures';
    }
    
    cb(null, path.join(baseDir, destFolder));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: fieldname-timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (optional, to restrict file types)
const fileFilter = (req, file, cb) => {
  // Accept images and pdfs generally
  if (
    file.mimetype.startsWith('image/') || 
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

module.exports = upload;
