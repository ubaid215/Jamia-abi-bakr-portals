const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// ============================================
// CLOUDINARY SETUP (only if credentials exist)
// ============================================
let cloudinary = null;
let CloudinaryStorage = null;

if (config.cloudinaryEnabled) {
    const cloudinaryModule = require('cloudinary').v2;
    CloudinaryStorage = require('multer-storage-cloudinary').CloudinaryStorage;

    cloudinaryModule.config({
        cloud_name: config.CLOUDINARY_CLOUD_NAME,
        api_key: config.CLOUDINARY_API_KEY,
        api_secret: config.CLOUDINARY_API_SECRET,
    });

    cloudinary = cloudinaryModule;
    console.log('☁️  Upload storage: Cloudinary');
} else {
    console.log('📁  Upload storage: Local (set CLOUDINARY_* env vars to enable Cloudinary)');
}

// ============================================
// FILE FILTER (unchanged — works for both)
// ============================================
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedDocTypes = /pdf|doc|docx/;
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    if (allowedImageTypes.test(extname) && mimetype.startsWith('image/')) {
        return cb(null, true);
    }
    if (allowedDocTypes.test(extname)) {
        return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WEBP) and documents (PDF, DOC, DOCX) are allowed.'));
};

// ============================================
// STORAGE ENGINE — Cloudinary or Local
// ============================================

/**
 * Determines Cloudinary folder based on field name and route.
 * Mirrors the local upload path logic exactly.
 */
function getCloudinaryFolder(req, file) {
    if (file.fieldname === 'profileImage') {
        return 'madrisa/profiles';
    }
    if (req.path.includes('teachers')) {
        return 'madrisa/documents/teachers';
    }
    if (req.path.includes('students')) {
        return 'madrisa/documents/students';
    }
    return 'madrisa/documents';
}

/**
 * Determines resource type for Cloudinary.
 * PDFs and docs must be 'raw', images use 'image' (enables transformations).
 */
function getResourceType(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.doc', '.docx'].includes(ext)) return 'raw';
    return 'image';
}

const buildStorage = () => {
    if (config.cloudinaryEnabled) {
        return new CloudinaryStorage({
            cloudinary,
            params: async (req, file) => ({
                folder: getCloudinaryFolder(req, file),
                resource_type: getResourceType(file),
                // Unique public_id — same uniqueness guarantee as local uuid filenames
                public_id: `${uuidv4()}-${Date.now()}`,
                // For images: auto-optimize quality and format
                ...(getResourceType(file) === 'image' && {
                    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
                }),
            }),
        });
    }

    // ── Local disk storage (original logic, unchanged) ──
    return multer.diskStorage({
        destination: async (req, file, cb) => {
            try {
                let uploadPath;
                if (file.fieldname === 'profileImage') {
                    uploadPath = 'uploads/profiles';
                } else if (req.path.includes('teachers')) {
                    uploadPath = 'uploads/documents/teachers';
                } else if (req.path.includes('students')) {
                    uploadPath = 'uploads/documents/students';
                } else {
                    uploadPath = 'uploads/documents';
                }
                await fs.mkdir(uploadPath, { recursive: true });
                cb(null, uploadPath);
            } catch (error) {
                cb(error);
            }
        },
        filename: (req, file, cb) => {
            cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
        },
    });
};

// ============================================
// MULTER INSTANCE
// ============================================
const upload = multer({
    storage: buildStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ============================================
// UPLOAD FIELDS (unchanged)
// ============================================
const teacherUploadFields = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
    { name: 'qualificationCertificates', maxCount: 5 },
    { name: 'experienceCertificates', maxCount: 5 },
    { name: 'otherDocuments', maxCount: 10 },
]);

const studentUploadFields = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'cnicOrBForm', maxCount: 1 },
    { name: 'previousSchoolCertificate', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 10 },
]);

// ============================================
// PROCESS UPLOADED FILES (unchanged interface)
// ============================================
const requireProfileImage = (req, res, next) => {
    if (!req.files || !req.files.profileImage) {
        return res.status(400).json({ error: 'Profile image is required during enrollment' });
    }
    next();
};

const processUploadedFiles = (req, res, next) => {
    try {
        if (!req.files) return next();

        // When using Cloudinary, file.path = the Cloudinary URL (https://res.cloudinary.com/...)
        // When using local storage, file.path = local disk path (uploads/profiles/uuid.jpg)
        // Either way, .path is the correct reference to store in DB — no changes needed downstream.
        const getFilePath = (fileArray) =>
            fileArray?.[0]?.path ?? null;

        const getMultipleFilePaths = (fileArray) => {
            if (!fileArray?.length) return null;
            return JSON.stringify(fileArray.map((f) => f.path));
        };

        if (req.files.profileImage)
            req.profileImagePath = getFilePath(req.files.profileImage);
        if (req.files.cnicFront)
            req.cnicFrontPath = getFilePath(req.files.cnicFront);
        if (req.files.cnicBack)
            req.cnicBackPath = getFilePath(req.files.cnicBack);
        if (req.files.qualificationCertificates)
            req.qualificationCertificatesPath = getMultipleFilePaths(req.files.qualificationCertificates);
        if (req.files.experienceCertificates)
            req.experienceCertificatesPath = getMultipleFilePaths(req.files.experienceCertificates);
        if (req.files.birthCertificate)
            req.birthCertificatePath = getFilePath(req.files.birthCertificate);
        if (req.files.cnicOrBForm)
            req.cnicOrBFormPath = getFilePath(req.files.cnicOrBForm);
        if (req.files.previousSchoolCertificate)
            req.previousSchoolCertificatePath = getFilePath(req.files.previousSchoolCertificate);
        if (req.files.otherDocuments)
            req.otherDocumentsPath = getMultipleFilePaths(req.files.otherDocuments);

        next();
    } catch (error) {
        next(error);
    }
};

// ============================================
// FILE DELETION UTILITY
// ============================================

/**
 * Extracts the Cloudinary public_id from a full URL.
 * e.g. https://res.cloudinary.com/demo/image/upload/v123/madrisa/profiles/uuid.jpg
 *      → madrisa/profiles/uuid
 */
function extractPublicId(cloudinaryUrl) {
    try {
        // Match everything after /upload/v<version>/ and strip the extension
        const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
        return match?.[1] ?? null;
    } catch {
        return null;
    }
}

/**
 * Deletes a file from Cloudinary or local disk depending on storage mode.
 * Pass the stored path/URL — the function handles both transparently.
 */
const deleteFile = async (filePath) => {
    if (!filePath) return;

    if (config.cloudinaryEnabled && filePath.startsWith('http')) {
        try {
            const publicId = extractPublicId(filePath);
            if (!publicId) return;

            // Determine resource type from URL
            const resourceType = filePath.includes('/raw/') ? 'raw' : 'image';
            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            console.log(`Deleted from Cloudinary: ${publicId}`);
        } catch (err) {
            console.error('Cloudinary delete error:', err.message);
        }
        return;
    }

    // Local file deletion (original logic)
    try {
        await fs.unlink(filePath);
        console.log(`Deleted local file: ${filePath}`);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Error deleting local file:', err);
        }
    }
};

const deleteFiles = async (filePaths) => {
    if (!filePaths || !Array.isArray(filePaths)) return;
    for (const filePath of filePaths) {
        await deleteFile(filePath);
    }
};

module.exports = {
    upload,
    teacherUploadFields,
    studentUploadFields,
    requireProfileImage,
    processUploadedFiles,
    deleteFile,
    deleteFiles,
    cloudinary, 
};
