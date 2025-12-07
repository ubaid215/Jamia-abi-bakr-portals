const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create user-specific directory if needed
    const userDir = path.join(uploadsDir, req.user?.id || 'temp');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Middleware for handling single file upload
const singleUpload = (fieldName) => upload.single(fieldName);

// Middleware for handling multiple file uploads
const multipleUpload = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);

// Middleware for handling multiple fields
const fieldsUpload = (fields) => upload.fields(fields);

// Function to get file URL
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${req.user?.id || 'temp'}/${filename}`;
};

// Function to parse JSON array of documents
const parseDocuments = (req, fieldName) => {
  const files = req.files?.[fieldName];
  if (!files || files.length === 0) return null;
  
  return files.map(file => ({
    url: getFileUrl(req, file.filename),
    fileName: file.originalname,
    mimeType: file.mimetype
  }));
};

// Function to handle single file
const handleSingleFile = (req, fieldName) => {
  const file = req.file;
  if (!file) return null;
  
  return {
    url: getFileUrl(req, file.filename),
    fileName: file.originalname,
    mimeType: file.mimetype
  };
};

// Clean up temporary files on error
const cleanupFiles = (req) => {
  try {
    const files = req.file || req.files || [];
    const fileArray = Array.isArray(files) ? files : [files];
    
    fileArray.forEach(file => {
      if (file && file.path) {
        fs.unlinkSync(file.path);
      }
    });
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
};

module.exports = {
  upload,
  singleUpload,
  multipleUpload,
  fieldsUpload,
  getFileUrl,
  parseDocuments,
  handleSingleFile,
  cleanupFiles
};