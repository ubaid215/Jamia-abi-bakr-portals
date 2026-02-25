// controllers/admin/documentController.js
const prisma = require('../../db/prismaClient');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

// ── Is this a Cloudinary URL or a local path? ─────────────────
function isCloudinaryUrl(filePath) {
    return typeof filePath === 'string' && filePath.startsWith('http');
}

// ── Send file from either Cloudinary or local disk ───────────
function sendDocument(res, documentPath, fileName, contentType, isPreview = false) {
    if (isCloudinaryUrl(documentPath)) {
        // Redirect directly to Cloudinary — it handles streaming, CDN, and CORS
        return res.redirect(302, documentPath);
    }

    const filePath = path.join(__dirname, '../..', documentPath);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Document file not found on server' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const resolvedContentType = contentType || {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
    }[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', resolvedContentType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Content-Disposition',
        `${isPreview ? 'inline' : 'attachment'}; filename="${fileName || path.basename(filePath)}"`
    );

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    fileStream.on('error', (err) => {
        logger.error({ err }, 'Error streaming document');
        if (!res.headersSent) res.status(500).json({ error: 'Error streaming file' });
    });
}

// ── Delete file from correct backend ─────────────────────────
async function deleteStoredFile(filePath) {
    if (!filePath) return;

    if (isCloudinaryUrl(filePath)) {
        try {
            const { cloudinary } = require('../../middlewares/upload');
            if (!cloudinary) return;

            // Extract public_id from Cloudinary URL
            // e.g. https://res.cloudinary.com/cloud/image/upload/v123/madrisa/profiles/uuid.jpg
            //      → madrisa/profiles/uuid
            const match = filePath.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
            if (!match) return;

            const publicId = match[1];
            const resourceType = filePath.includes('/raw/') ? 'raw' : 'image';
            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            logger.info({ publicId }, 'Deleted from Cloudinary');
        } catch (err) {
            logger.warn({ err: err.message }, 'Could not delete Cloudinary file');
        }
        return;
    }

    // Local file
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info({ filePath }, 'Deleted local file');
        }
    } catch (err) {
        logger.warn({ err: err.message }, 'Could not delete local file');
    }
}

// ─────────────────────────────────────────────────────────────
// SERVE FUNCTIONS
// ─────────────────────────────────────────────────────────────

async function serveProfileImage(req, res) {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, profileImage: true, role: true },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.profileImage) return res.status(404).json({ error: 'Profile image not found' });

        return sendDocument(res, user.profileImage, null, 'image/jpeg', true);
    } catch (error) {
        logger.error({ err: error }, 'Error serving profile image');
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function serveTeacherDocument(req, res) {
    try {
        const { teacherId, type } = req.params;
        const { index, preview } = req.query;
        const isPreview = preview === 'true' || preview === '1';

        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId },
            include: { user: { select: { name: true } } },
        });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        const safeName = teacher.user.name.replace(/\s+/g, '-');
        let documentPath, fileName;

        switch (type) {
            case 'cnic-front':
                documentPath = teacher.cnicFront;
                fileName = `cnic-front-${safeName}`;
                break;
            case 'cnic-back':
                documentPath = teacher.cnicBack;
                fileName = `cnic-back-${safeName}`;
                break;
            case 'degree': {
                const docs = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [];
                if (index === undefined || !docs[index]) {
                    return res.status(400).json({ error: 'Specify document index', availableDocuments: docs.length });
                }
                documentPath = docs[index];
                fileName = `degree-${index}-${safeName}`;
                break;
            }
            case 'other': {
                const docs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
                if (index === undefined || !docs[index]) {
                    return res.status(400).json({ error: 'Specify document index', availableDocuments: docs.length });
                }
                documentPath = docs[index];
                fileName = `other-${index}-${safeName}`;
                break;
            }
            default:
                return res.status(400).json({
                    error: 'Invalid document type',
                    validTypes: ['cnic-front', 'cnic-back', 'degree', 'other'],
                });
        }

        if (!documentPath) return res.status(404).json({ error: 'Document not found' });

        return sendDocument(res, documentPath, fileName, null, isPreview);
    } catch (error) {
        logger.error({ err: error }, 'Error serving teacher document');
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function serveStudentDocument(req, res) {
    try {
        const { studentId, type } = req.params;
        const { index, preview } = req.query;
        const isPreview = preview === 'true' || preview === '1';

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { user: { select: { name: true } } },
        });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const safeName = student.user.name.replace(/\s+/g, '-');
        let documentPath, fileName;

        switch (type) {
            case 'birth-certificate':
                documentPath = student.birthCertificate;
                fileName = `birth-certificate-${safeName}`;
                break;
            case 'cnic-bform':
                documentPath = student.cnicOrBForm;
                fileName = `cnic-bform-${safeName}`;
                break;
            case 'previous-school':
                documentPath = student.previousSchoolCertificate;
                fileName = `previous-school-${safeName}`;
                break;
            case 'other': {
                const docs = student.otherDocuments ? JSON.parse(student.otherDocuments) : [];
                if (index === undefined || !docs[index]) {
                    return res.status(400).json({ error: 'Specify document index', availableDocuments: docs.length });
                }
                documentPath = docs[index];
                fileName = `other-${index}-${safeName}`;
                break;
            }
            default:
                return res.status(400).json({ error: 'Invalid document type' });
        }

        if (!documentPath) return res.status(404).json({ error: 'Document not found' });

        return sendDocument(res, documentPath, fileName, null, isPreview);
    } catch (error) {
        logger.error({ err: error }, 'Error serving student document');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─────────────────────────────────────────────────────────────
// PROFILE IMAGE UPDATE
// ─────────────────────────────────────────────────────────────

async function updateStudentProfileImage(req, res) {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No image file provided' });

        const student = await prisma.student.findFirst({
            where: { OR: [{ id }, { userId: id }] },
        });
        if (!student) {
            await deleteStoredFile(req.file.path);
            return res.status(404).json({ error: 'Student not found' });
        }

        // Delete old image from whichever backend stored it
        await deleteStoredFile(student.profileImage);

        await prisma.student.update({
            where: { id: student.id },
            data: { profileImage: req.file.path },
        });
        await prisma.user.update({
            where: { id: student.userId },
            data: { profileImage: req.file.path },
        });

        res.json({
            message: 'Profile image updated successfully',
            profileImage: req.file.path,
        });
    } catch (error) {
        logger.error({ err: error }, 'Error updating student profile image');
        await deleteStoredFile(req.file?.path);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─────────────────────────────────────────────────────────────
// STUDENT DOCUMENT UPLOAD / DELETE
// ─────────────────────────────────────────────────────────────

async function uploadStudentDocument(req, res) {
    try {
        const { id } = req.params;
        const { type } = req.body;

        if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });
        if (!type || !['birth-certificate', 'cnic-bform', 'previous-school', 'other'].includes(type)) {
            await deleteStoredFile(req.file.path);
            return res.status(400).json({ error: 'Valid document type is required' });
        }

        let student = await prisma.student.findUnique({ where: { id } });
        if (!student) student = await prisma.student.findFirst({ where: { userId: id } });

        if (!student) {
            await deleteStoredFile(req.file.path);
            return res.status(404).json({ error: 'Student not found' });
        }

        let updateData = {};

        switch (type) {
            case 'birth-certificate':
                await deleteStoredFile(student.birthCertificate);
                updateData = { birthCertificate: req.file.path };
                break;
            case 'cnic-bform':
                await deleteStoredFile(student.cnicOrBForm);
                updateData = { cnicOrBForm: req.file.path };
                break;
            case 'previous-school':
                await deleteStoredFile(student.previousSchoolCertificate);
                updateData = { previousSchoolCertificate: req.file.path };
                break;
            case 'other': {
                let existingDocs = [];
                try { existingDocs = student.otherDocuments ? JSON.parse(student.otherDocuments) : []; } catch { existingDocs = []; }
                existingDocs.push(req.file.path);
                updateData = { otherDocuments: JSON.stringify(existingDocs) };
                break;
            }
        }

        await prisma.student.update({ where: { id: student.id }, data: updateData });

        res.json({
            message: 'Document uploaded successfully',
            document: {
                type,
                path: req.file.path,
                fileName: req.file.originalname,
                size: req.file.size,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Upload student document error');
        await deleteStoredFile(req.file?.path);
        res.status(500).json({ error: 'Failed to upload document' });
    }
}

async function deleteStudentDocument(req, res) {
    try {
        const { studentId, type } = req.params;
        const { index } = req.query;

        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        let updateData = {};
        let filePathToDelete = null;

        switch (type) {
            case 'birth-certificate':
                if (!student.birthCertificate) return res.status(404).json({ error: 'Birth certificate not found' });
                filePathToDelete = student.birthCertificate;
                updateData = { birthCertificate: null };
                break;
            case 'cnic-bform':
                if (!student.cnicOrBForm) return res.status(404).json({ error: 'CNIC/B-Form not found' });
                filePathToDelete = student.cnicOrBForm;
                updateData = { cnicOrBForm: null };
                break;
            case 'previous-school':
                if (!student.previousSchoolCertificate) return res.status(404).json({ error: 'Previous school certificate not found' });
                filePathToDelete = student.previousSchoolCertificate;
                updateData = { previousSchoolCertificate: null };
                break;
            case 'other': {
                let existingDocs = [];
                try { existingDocs = student.otherDocuments ? JSON.parse(student.otherDocuments) : []; } catch {
                    return res.status(400).json({ error: 'Error parsing document list' });
                }
                const docIndex = parseInt(index) || 0;
                if (docIndex < 0 || docIndex >= existingDocs.length) {
                    return res.status(404).json({ error: 'Document not found at specified index' });
                }
                filePathToDelete = existingDocs[docIndex];
                existingDocs.splice(docIndex, 1);
                updateData = { otherDocuments: JSON.stringify(existingDocs) };
                break;
            }
            default:
                return res.status(400).json({ error: 'Invalid document type' });
        }

        await deleteStoredFile(filePathToDelete);
        await prisma.student.update({ where: { id: studentId }, data: updateData });

        res.json({
            message: 'Document deleted successfully',
            deleted: { type, path: filePathToDelete },
        });
    } catch (error) {
        logger.error({ err: error }, 'Delete student document error');
        res.status(500).json({ error: 'Failed to delete document' });
    }
}

// ─────────────────────────────────────────────────────────────
// TEACHER DOCUMENT UPLOAD / DELETE
// ─────────────────────────────────────────────────────────────

async function uploadTeacherDocument(req, res) {
    try {
        const { id } = req.params;
        const { type } = req.body;

        if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });
        if (!type || !['cnic-front', 'cnic-back', 'degree', 'other'].includes(type)) {
            await deleteStoredFile(req.file.path);
            return res.status(400).json({ error: 'Valid document type is required' });
        }

        const teacher = await prisma.teacher.findFirst({
            where: { OR: [{ id }, { userId: id }] },
        });
        if (!teacher) {
            await deleteStoredFile(req.file.path);
            return res.status(404).json({ error: 'Teacher not found' });
        }

        let updateData = {};

        switch (type) {
            case 'cnic-front':
                await deleteStoredFile(teacher.cnicFront);
                updateData = { cnicFront: req.file.path };
                break;
            case 'cnic-back':
                await deleteStoredFile(teacher.cnicBack);
                updateData = { cnicBack: req.file.path };
                break;
            case 'degree': {
                let existingDocs = [];
                try { existingDocs = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : []; } catch { existingDocs = []; }
                existingDocs.push(req.file.path);
                updateData = { degreeDocuments: JSON.stringify(existingDocs) };
                break;
            }
            case 'other': {
                let existingDocs = [];
                try { existingDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : []; } catch { existingDocs = []; }
                existingDocs.push(req.file.path);
                updateData = { otherDocuments: JSON.stringify(existingDocs) };
                break;
            }
        }

        await prisma.teacher.update({ where: { id: teacher.id }, data: updateData });

        res.json({
            message: `${type.replace('-', ' ')} uploaded successfully`,
            document: {
                type,
                path: req.file.path,
                fileName: req.file.originalname,
                size: req.file.size,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Upload teacher document error');
        await deleteStoredFile(req.file?.path);
        res.status(500).json({ error: 'Failed to upload document' });
    }
}

async function deleteTeacherDocument(req, res) {
    try {
        const { teacherId, type } = req.params;
        const { index } = req.query;

        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        let updateData = {};
        let filePathToDelete = null;

        switch (type) {
            case 'cnic-front':
                if (!teacher.cnicFront) return res.status(404).json({ error: 'CNIC front not found' });
                filePathToDelete = teacher.cnicFront;
                updateData = { cnicFront: null };
                break;
            case 'cnic-back':
                if (!teacher.cnicBack) return res.status(404).json({ error: 'CNIC back not found' });
                filePathToDelete = teacher.cnicBack;
                updateData = { cnicBack: null };
                break;
            case 'degree': {
                let existingDocs = [];
                try { existingDocs = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : []; } catch {
                    return res.status(400).json({ error: 'Error parsing document list' });
                }
                const docIndex = parseInt(index) || 0;
                if (docIndex < 0 || docIndex >= existingDocs.length) {
                    return res.status(404).json({ error: 'Document not found at specified index' });
                }
                filePathToDelete = existingDocs[docIndex];
                existingDocs.splice(docIndex, 1);
                updateData = { degreeDocuments: JSON.stringify(existingDocs) };
                break;
            }
            case 'qualification': {
                let existingDocs = [];
                try { existingDocs = teacher.qualificationCertificates ? JSON.parse(teacher.qualificationCertificates) : []; } catch {
                    return res.status(400).json({ error: 'Error parsing document list' });
                }
                const docIndex = parseInt(index) || 0;
                if (docIndex < 0 || docIndex >= existingDocs.length) {
                    return res.status(404).json({ error: 'Document not found at specified index' });
                }
                filePathToDelete = existingDocs[docIndex];
                existingDocs.splice(docIndex, 1);
                updateData = { qualificationCertificates: JSON.stringify(existingDocs) };
                break;
            }
            case 'experience': {
                let existingDocs = [];
                try { existingDocs = teacher.experienceCertificates ? JSON.parse(teacher.experienceCertificates) : []; } catch {
                    return res.status(400).json({ error: 'Error parsing document list' });
                }
                const docIndex = parseInt(index) || 0;
                if (docIndex < 0 || docIndex >= existingDocs.length) {
                    return res.status(404).json({ error: 'Document not found at specified index' });
                }
                filePathToDelete = existingDocs[docIndex];
                existingDocs.splice(docIndex, 1);
                updateData = { experienceCertificates: JSON.stringify(existingDocs) };
                break;
            }
            case 'other': {
                let existingDocs = [];
                try { existingDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : []; } catch {
                    return res.status(400).json({ error: 'Error parsing document list' });
                }
                const docIndex = parseInt(index) || 0;
                if (docIndex < 0 || docIndex >= existingDocs.length) {
                    return res.status(404).json({ error: 'Document not found at specified index' });
                }
                filePathToDelete = existingDocs[docIndex];
                existingDocs.splice(docIndex, 1);
                updateData = { otherDocuments: JSON.stringify(existingDocs) };
                break;
            }
            default:
                return res.status(400).json({ error: 'Invalid document type' });
        }

        await deleteStoredFile(filePathToDelete);
        await prisma.teacher.update({ where: { id: teacherId }, data: updateData });

        res.json({
            message: 'Document deleted successfully',
            deleted: { type, path: filePathToDelete },
        });
    } catch (error) {
        logger.error({ err: error }, 'Delete teacher document error');
        res.status(500).json({ error: 'Failed to delete document' });
    }
}

// ─────────────────────────────────────────────────────────────
// GET WITH DOCUMENTS
// ─────────────────────────────────────────────────────────────

async function getTeacherWithDocuments(req, res) {
    try {
        const { id } = req.params;

        const teacher = await prisma.teacher.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            include: {
                user: {
                    select: {
                        id: true, name: true, email: true, phone: true,
                        profileImage: true, status: true, createdAt: true,
                    },
                },
                classes: {
                    include: {
                        _count: {
                            select: { enrollments: { where: { isCurrent: true } } },
                        },
                    },
                },
                subjects: {
                    include: {
                        classRoom: { select: { name: true } },
                    },
                },
            },
        });

        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        const documents = {
            profileImage: teacher.profileImage,
            cnicFront: teacher.cnicFront,
            cnicBack: teacher.cnicBack,
            degreeDocuments: teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [],
            otherDocuments: teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [],
        };

        // For Cloudinary URLs, use the URL directly as the viewable link.
        // For local paths, generate API proxy URLs.
        const resolveUrl = (docPath, fallbackApiUrl) => {
            if (!docPath) return null;
            if (isCloudinaryUrl(docPath)) return docPath;
            return fallbackApiUrl;
        };

        const documentUrls = {
            profileImageUrl: resolveUrl(
                teacher.profileImage,
                `/api/admin/files/profile-image/${teacher.userId}`
            ),
            cnicFrontUrl: resolveUrl(
                teacher.cnicFront,
                `/api/admin/teachers/${teacher.id}/documents/cnic-front`
            ),
            cnicBackUrl: resolveUrl(
                teacher.cnicBack,
                `/api/admin/teachers/${teacher.id}/documents/cnic-back`
            ),
            degreeDocumentsUrls: documents.degreeDocuments.map((docPath, idx) =>
                resolveUrl(docPath, `/api/admin/teachers/${teacher.id}/documents/degree?index=${idx}`)
            ),
            otherDocumentsUrls: documents.otherDocuments.map((docPath, idx) =>
                resolveUrl(docPath, `/api/admin/teachers/${teacher.id}/documents/other?index=${idx}`)
            ),
        };

        res.json({
            teacher: teacher.user,
            teacherRecordId: teacher.id,
            profile: {
                bio: teacher.bio,
                specialization: teacher.specialization,
                qualification: teacher.qualification,
                cnic: teacher.cnic,
                experience: teacher.experience,
                joiningDate: teacher.joiningDate,
                salary: teacher.salary,
                employmentType: teacher.employmentType,
                dateOfBirth: teacher.dateOfBirth,
                gender: teacher.gender,
                phoneSecondary: teacher.phoneSecondary,
                address: teacher.address,
                bloodGroup: teacher.bloodGroup,
                medicalConditions: teacher.medicalConditions,
                emergencyContactName: teacher.emergencyContactName,
                emergencyContactPhone: teacher.emergencyContactPhone,
                emergencyContactRelation: teacher.emergencyContactRelation,
                bankName: teacher.bankName,
                accountNumber: teacher.accountNumber,
                iban: teacher.iban,
            },
            assignments: {
                classes: teacher.classes,
                subjects: teacher.subjects,
            },
            documents,
            urls: documentUrls,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get teacher with documents error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getStudentWithDocuments(req, res) {
    try {
        const { id } = req.params;

        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true, name: true, email: true, phone: true,
                        profileImage: true, status: true, createdAt: true,
                    },
                },
                currentEnrollment: {
                    include: {
                        classRoom: { select: { name: true, grade: true, type: true } },
                    },
                },
            },
        });

        if (!student) return res.status(404).json({ error: 'Student not found' });

        const documents = {
            profileImage: student.profileImage,
            birthCertificate: student.birthCertificate,
            cnicOrBForm: student.cnicOrBForm,
            previousSchoolCertificate: student.previousSchoolCertificate,
            otherDocuments: student.otherDocuments ? JSON.parse(student.otherDocuments) : [],
        };

        const resolveUrl = (docPath, fallbackApiUrl) => {
            if (!docPath) return null;
            if (isCloudinaryUrl(docPath)) return docPath;
            return fallbackApiUrl;
        };

        const documentUrls = {
            profileImageUrl: resolveUrl(
                student.profileImage,
                `/api/admin/files/profile-image/${student.userId}`
            ),
            birthCertificateUrl: resolveUrl(
                student.birthCertificate,
                `/api/admin/students/${student.id}/documents/birth-certificate`
            ),
            cnicBformUrl: resolveUrl(
                student.cnicOrBForm,
                `/api/admin/students/${student.id}/documents/cnic-bform`
            ),
            previousSchoolCertificateUrl: resolveUrl(
                student.previousSchoolCertificate,
                `/api/admin/students/${student.id}/documents/previous-school`
            ),
            otherDocumentsUrls: documents.otherDocuments.map((docPath, idx) =>
                resolveUrl(docPath, `/api/admin/students/${student.id}/documents/other?index=${idx}`)
            ),
        };

        res.json({
            student: student.user,
            studentRecordId: student.id,
            profile: {
                admissionNo: student.admissionNo,
                dateOfBirth: student.dob,
                gender: student.gender,
                placeOfBirth: student.placeOfBirth,
                nationality: student.nationality,
                religion: student.religion,
                bloodGroup: student.bloodGroup,
                medicalConditions: student.medicalConditions,
                allergies: student.allergies,
                medication: student.medication,
                guardianName: student.guardianName,
                guardianRelation: student.guardianRelation,
                guardianPhone: student.guardianPhone,
                guardianEmail: student.guardianEmail,
                guardianOccupation: student.guardianOccupation,
                guardianCNIC: student.guardianCNIC,
                guardian2Name: student.guardian2Name,
                guardian2Relation: student.guardian2Relation,
                guardian2Phone: student.guardian2Phone,
                guardian2Email: student.guardian2Email,
                address: student.address,
                city: student.city,
                province: student.province,
                postalCode: student.postalCode,
                emergencyContactName: student.emergencyContactName,
                emergencyContactPhone: student.emergencyContactPhone,
                emergencyContactRelation: student.emergencyContactRelation,
            },
            academic: {
                currentClass: student.currentEnrollment?.classRoom,
                rollNumber: student.currentEnrollment?.rollNumber,
            },
            documents,
            urls: documentUrls,
        });
    } catch (error) {
        logger.error({ err: error }, 'Get student with documents error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ─────────────────────────────────────────────────────────────
// EXPORT DOCUMENTS INFO
// ─────────────────────────────────────────────────────────────

async function exportUserDocumentsInfo(req, res) {
    try {
        const { userId, userType } = req.params;

        let documents = [];
        let userInfo = {};

        const resolveUrl = (docPath, apiUrl) => {
            if (!docPath) return null;
            if (isCloudinaryUrl(docPath)) return docPath;
            return apiUrl;
        };

        if (userType === 'teacher') {
            const teacher = await prisma.teacher.findFirst({
                where: { userId },
                include: { user: { select: { name: true, email: true } } },
            });

            if (teacher) {
                userInfo = {
                    type: 'teacher',
                    name: teacher.user.name,
                    email: teacher.user.email,
                    teacherId: teacher.id,
                };
                documents = [
                    {
                        type: 'profile-image',
                        path: teacher.profileImage,
                        url: resolveUrl(teacher.profileImage, `/api/admin/files/profile-image/${userId}`),
                    },
                    {
                        type: 'cnic-front',
                        path: teacher.cnicFront,
                        url: resolveUrl(teacher.cnicFront, `/api/admin/teachers/${teacher.id}/documents/cnic-front`),
                    },
                    {
                        type: 'cnic-back',
                        path: teacher.cnicBack,
                        url: resolveUrl(teacher.cnicBack, `/api/admin/teachers/${teacher.id}/documents/cnic-back`),
                    },
                    ...(teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments).map((p, i) => ({
                        type: 'degree',
                        index: i,
                        path: p,
                        url: resolveUrl(p, `/api/admin/teachers/${teacher.id}/documents/degree?index=${i}`),
                    })) : []),
                    ...(teacher.otherDocuments ? JSON.parse(teacher.otherDocuments).map((p, i) => ({
                        type: 'other',
                        index: i,
                        path: p,
                        url: resolveUrl(p, `/api/admin/teachers/${teacher.id}/documents/other?index=${i}`),
                    })) : []),
                ].filter(doc => doc.path);
            }
        } else if (userType === 'student') {
            const student = await prisma.student.findFirst({
                where: { userId },
                include: { user: { select: { name: true, email: true } } },
            });

            if (student) {
                userInfo = {
                    type: 'student',
                    name: student.user.name,
                    email: student.user.email,
                    studentId: student.id,
                    admissionNo: student.admissionNo,
                };
                documents = [
                    {
                        type: 'profile-image',
                        path: student.profileImage,
                        url: resolveUrl(student.profileImage, `/api/admin/files/profile-image/${userId}`),
                    },
                    {
                        type: 'birth-certificate',
                        path: student.birthCertificate,
                        url: resolveUrl(student.birthCertificate, `/api/admin/students/${student.id}/documents/birth-certificate`),
                    },
                    {
                        type: 'cnic-bform',
                        path: student.cnicOrBForm,
                        url: resolveUrl(student.cnicOrBForm, `/api/admin/students/${student.id}/documents/cnic-bform`),
                    },
                    {
                        type: 'previous-school',
                        path: student.previousSchoolCertificate,
                        url: resolveUrl(student.previousSchoolCertificate, `/api/admin/students/${student.id}/documents/previous-school`),
                    },
                    ...(student.otherDocuments ? JSON.parse(student.otherDocuments).map((p, i) => ({
                        type: 'other',
                        index: i,
                        path: p,
                        url: resolveUrl(p, `/api/admin/students/${student.id}/documents/other?index=${i}`),
                    })) : []),
                ].filter(doc => doc.path);
            }
        }

        res.json({
            user: userInfo,
            documents,
            summary: {
                totalDocuments: documents.length,
                availableForDownload: documents.filter(doc => doc.url).length,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Export documents info error');
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    serveProfileImage,
    serveTeacherDocument,
    serveStudentDocument,
    updateStudentProfileImage,
    uploadStudentDocument,
    deleteStudentDocument,
    uploadTeacherDocument,
    deleteTeacherDocument,
    getTeacherWithDocuments,
    getStudentWithDocuments,
    exportUserDocumentsInfo,
};