const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const dirs = [
    'uploads/profiles',
    'uploads/documents/teachers',
    'uploads/documents/students'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};

// Initialize directories
ensureUploadDirs();

// File filter - allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf|doc|docx/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  
  // Check if it's an image
  if (allowedImageTypes.test(extname) && mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  
  // Check if it's a document
  if (allowedDocTypes.test(extname)) {
    return cb(null, true);
  }
  
  cb(new Error(`Invalid file type. Only images (JPEG, PNG, GIF, WEBP) and documents (PDF, DOC, DOCX) are allowed.`));
};

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let uploadPath;
      
      // Profile images go to profiles folder
      if (file.fieldname === 'profileImage') {
        uploadPath = 'uploads/profiles';
      } 
      // Teacher documents
      else if (req.path.includes('teachers')) {
        uploadPath = 'uploads/documents/teachers';
      }
      // Student documents
      else if (req.path.includes('students')) {
        uploadPath = 'uploads/documents/students';
      }
      else {
        uploadPath = 'uploads/documents';
      }
      
      // Ensure directory exists
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid-timestamp-originalname
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Teacher upload fields
const teacherUploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'cnicFront', maxCount: 1 },
  { name: 'cnicBack', maxCount: 1 },
  { name: 'qualificationCertificates', maxCount: 5 },
  { name: 'experienceCertificates', maxCount: 5 },
  { name: 'otherDocuments', maxCount: 10 }
]);

// Student upload fields
const studentUploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 },
  { name: 'cnicOrBForm', maxCount: 1 },
  { name: 'previousSchoolCertificate', maxCount: 1 },
  { name: 'otherDocuments', maxCount: 10 }
]);

// Middleware to check required profile image
const requireProfileImage = (req, res, next) => {
  if (!req.files || !req.files.profileImage) {
    return res.status(400).json({ 
      error: 'Profile image is required during enrollment' 
    });
  }
  next();
};

// Process uploaded files and attach to request
const processUploadedFiles = (req, res, next) => {
  try {
    if (!req.files) {
      return next();
    }

    // Helper to get file path
    const getFilePath = (fileArray) => {
      return fileArray && fileArray[0] ? fileArray[0].path : null;
    };

    // Helper to get multiple file paths as JSON string
    const getMultipleFilePaths = (fileArray) => {
      if (!fileArray || fileArray.length === 0) return null;
      const paths = fileArray.map(file => file.path);
      return JSON.stringify(paths);
    };

    // Process profile image
    if (req.files.profileImage) {
      req.profileImagePath = getFilePath(req.files.profileImage);
    }

    // Process teacher-specific documents
    if (req.files.cnicFront) {
      req.cnicFrontPath = getFilePath(req.files.cnicFront);
    }
    if (req.files.cnicBack) {
      req.cnicBackPath = getFilePath(req.files.cnicBack);
    }
    if (req.files.qualificationCertificates) {
      req.qualificationCertificatesPath = getMultipleFilePaths(req.files.qualificationCertificates);
    }
    if (req.files.experienceCertificates) {
      req.experienceCertificatesPath = getMultipleFilePaths(req.files.experienceCertificates);
    }

    // Process student-specific documents
    if (req.files.birthCertificate) {
      req.birthCertificatePath = getFilePath(req.files.birthCertificate);
    }
    if (req.files.cnicOrBForm) {
      req.cnicOrBFormPath = getFilePath(req.files.cnicOrBForm);
    }
    if (req.files.previousSchoolCertificate) {
      req.previousSchoolCertificatePath = getFilePath(req.files.previousSchoolCertificate);
    }

    // Process other documents (common for both)
    if (req.files.otherDocuments) {
      req.otherDocumentsPath = getMultipleFilePaths(req.files.otherDocuments);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// File deletion utility
const deleteFile = async (filePath) => {
  try {
    if (!filePath) return;
    
    await fs.unlink(filePath);
    console.log(`Deleted file: ${filePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') { // Ignore if file doesn't exist
      console.error('Error deleting file:', error);
    }
  }
};

// Delete multiple files
const deleteFiles = async (filePaths) => {
  if (!filePaths || !Array.isArray(filePaths)) return;
  
  for (const filePath of filePaths) {
    await deleteFile(filePath);
  }
};

module.exports = {
  upload, // Export the multer instance
  teacherUploadFields,
  studentUploadFields,
  requireProfileImage,
  processUploadedFiles,
  deleteFile,
  deleteFiles
};