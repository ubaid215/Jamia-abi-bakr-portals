// controllers/admin/documentController.js — File serving, upload, and document management
const prisma = require('../../db/prismaClient');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

// Serve profile image for any user
async function serveProfileImage(req, res) {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, profileImage: true, role: true },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.profileImage) return res.status(404).json({ error: 'Profile image not found' });

        const filePath = path.join(__dirname, '../..', user.profileImage);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Profile image file not found on server' });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp',
        }[ext] || 'image/jpeg';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.sendFile(filePath);
    } catch (error) {
        logger.error({ err: error }, 'Error serving profile image');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Serve teacher documents
async function serveTeacherDocument(req, res) {
    try {
        const { teacherId, type } = req.params;
        const { index } = req.query;

        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId },
            include: { user: { select: { name: true, email: true } } },
        });

        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        let documentPath;
        let fileName;

        switch (type) {
            case 'cnic-front':
                documentPath = teacher.cnicFront;
                fileName = `cnic-front-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                break;
            case 'cnic-back':
                documentPath = teacher.cnicBack;
                fileName = `cnic-back-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                break;
            case 'degree': {
                const degreePaths = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [];
                if (index !== undefined && degreePaths[index]) {
                    documentPath = degreePaths[index];
                    fileName = `degree-${index}-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                } else {
                    return res.status(400).json({ error: 'Specify document index', availableDocuments: degreePaths.length });
                }
                break;
            }
            case 'other': {
                const otherPaths = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
                if (index !== undefined && otherPaths[index]) {
                    documentPath = otherPaths[index];
                    fileName = `other-${index}-${teacher.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                } else {
                    return res.status(400).json({ error: 'Specify document index', availableDocuments: otherPaths.length });
                }
                break;
            }
            default:
                return res.status(400).json({ error: 'Invalid document type', validTypes: ['cnic-front', 'cnic-back', 'degree', 'other'] });
        }

        if (!documentPath) return res.status(404).json({ error: 'Document not found' });

        const filePath = path.join(__dirname, '../..', documentPath);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found on server' });

        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.pdf': 'application/pdf', '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp',
        }[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName || path.basename(filePath)}"`);
        res.sendFile(filePath);
    } catch (error) {
        logger.error({ err: error }, 'Error serving teacher document');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Serve student documents
// In documentController.js - Update serveStudentDocument
async function serveStudentDocument(req, res) {
    try {
        const { studentId, type } = req.params;
        const { index, preview } = req.query;

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { user: { select: { name: true, email: true } } },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        let documentPath;
        let fileName;

        switch (type) {
            case 'birth-certificate':
                documentPath = student.birthCertificate;
                fileName = `birth-certificate-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                break;
            case 'cnic-bform':
                documentPath = student.cnicOrBForm;
                fileName = `cnic-bform-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                break;
            case 'previous-school':
                documentPath = student.previousSchoolCertificate;
                fileName = `previous-school-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                break;
            case 'other': {
                const otherPaths = student.otherDocuments ? JSON.parse(student.otherDocuments) : [];
                if (index !== undefined && otherPaths[index]) {
                    documentPath = otherPaths[index];
                    fileName = `other-${index}-${student.user.name.replace(/\s+/g, '-')}${path.extname(documentPath || '')}`;
                } else {
                    return res.status(400).json({ error: 'Specify document index', availableDocuments: otherPaths.length });
                }
                break;
            }
            default:
                return res.status(400).json({ error: 'Invalid document type' });
        }

        if (!documentPath) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const filePath = path.join(__dirname, '../..', documentPath);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Document file not found on server' });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        }[ext] || 'application/octet-stream';

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // If preview=true, show inline, otherwise download
        if (preview === 'true' || preview === '1') {
            // Preview mode - show in browser
            res.setHeader('Content-Disposition', `inline; filename="${fileName || path.basename(filePath)}"`);
        } else {
            // Download mode
            res.setHeader('Content-Disposition', `attachment; filename="${fileName || path.basename(filePath)}"`);
        }

        // Stream the file
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Length', stat.size);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
            logger.error({ err: error }, 'Error streaming document');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error serving student document');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Update student profile image
async function updateStudentProfileImage(req, res) {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No image file provided' });

        const student = await prisma.student.findFirst({
            where: { OR: [{ id }, { userId: id }] },
        });

        if (!student) return res.status(404).json({ error: 'Student not found' });

        if (student.profileImage) {
            const oldPath = path.join(__dirname, '../..', student.profileImage);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await prisma.student.update({
            where: { id: student.id },
            data: { profileImage: req.file.path },
        });

        await prisma.user.update({
            where: { id: student.userId },
            data: { profileImage: req.file.path },
        });

        res.json({ message: 'Profile image updated successfully', profileImage: req.file.path });
    } catch (error) {
        logger.error({ err: error }, 'Error updating profile image');
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Upload student document
async function uploadStudentDocument(req, res) {
    try {
        const { id } = req.params;
        const { type } = req.body;

        if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });
        if (!type || !['birth-certificate', 'cnic-bform', 'previous-school', 'other'].includes(type)) {
            return res.status(400).json({ error: 'Valid document type is required' });
        }

        let student = await prisma.student.findUnique({ where: { id } });
        if (!student) {
            student = await prisma.student.findFirst({ where: { userId: id } });
        }

        if (!student) {
            if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Student not found' });
        }

        let updateData = {};

        switch (type) {
            case 'birth-certificate':
                if (student.birthCertificate && fs.existsSync(student.birthCertificate)) {
                    fs.unlinkSync(student.birthCertificate);
                }
                updateData = { birthCertificate: req.file.path };
                break;
            case 'cnic-bform':
                if (student.cnicOrBForm && fs.existsSync(student.cnicOrBForm)) {
                    fs.unlinkSync(student.cnicOrBForm);
                }
                updateData = { cnicOrBForm: req.file.path };
                break;
            case 'previous-school':
                if (student.previousSchoolCertificate && fs.existsSync(student.previousSchoolCertificate)) {
                    fs.unlinkSync(student.previousSchoolCertificate);
                }
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
            document: { type, path: req.file.path, fileName: req.file.originalname, size: req.file.size },
        });
    } catch (error) {
        logger.error({ err: error }, 'Upload student document error');
        if (req.file && req.file.path) {
            try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch { }
        }
        res.status(500).json({ error: 'Failed to upload document' });
    }
}

// Delete student document
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
                try { existingDocs = student.otherDocuments ? JSON.parse(student.otherDocuments) : []; } catch { return res.status(400).json({ error: 'Error parsing document list' }); }
                const docIndex = parseInt(index) || 0;
                if (docIndex >= existingDocs.length || docIndex < 0) {
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

        if (filePathToDelete) {
            try { if (fs.existsSync(filePathToDelete)) fs.unlinkSync(filePathToDelete); } catch { }
        }

        await prisma.student.update({ where: { id: studentId }, data: updateData });

        res.json({ message: 'Document deleted successfully', deleted: { type, path: filePathToDelete } });
    } catch (error) {
        logger.error({ err: error }, 'Delete student document error');
        res.status(500).json({ error: 'Failed to delete document' });
    }
}

// Upload teacher document
async function uploadTeacherDocument(req, res) {
    try {
        const { id } = req.params;
        const { type } = req.body;

        if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });
        if (!type || !['cnic-front', 'cnic-back', 'degree', 'other'].includes(type)) {
            if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Valid document type is required' });
        }

        const teacher = await prisma.teacher.findFirst({ where: { OR: [{ id }, { userId: id }] } });
        if (!teacher) {
            if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Teacher not found' });
        }

        let updateData = {};

        if (type === 'cnic-front') {
            if (teacher.cnicFront && fs.existsSync(teacher.cnicFront)) fs.unlinkSync(teacher.cnicFront);
            updateData = { cnicFront: req.file.path };
        } else if (type === 'cnic-back') {
            if (teacher.cnicBack && fs.existsSync(teacher.cnicBack)) fs.unlinkSync(teacher.cnicBack);
            updateData = { cnicBack: req.file.path };
        } else if (type === 'degree') {
            const existingDocs = teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments) : [];
            existingDocs.push(req.file.path);
            updateData = { degreeDocuments: JSON.stringify(existingDocs) };
        } else if (type === 'other') {
            const existingDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
            existingDocs.push(req.file.path);
            updateData = { otherDocuments: JSON.stringify(existingDocs) };
        }

        await prisma.teacher.update({ where: { id: teacher.id }, data: updateData });

        res.json({
            message: `${type.replace('-', ' ')} uploaded successfully`,
            document: { type, path: req.file.path, fileName: req.file.originalname, size: req.file.size },
        });
    } catch (error) {
        logger.error({ err: error }, 'Upload teacher document error');
        if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to upload document' });
    }
}

// Delete teacher document
async function deleteTeacherDocument(req, res) {
    try {
        const { teacherId, type } = req.params;
        const { index } = req.query;

        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        let updateData = {};
        let filePathToDelete = null;

        if (type === 'cnic-front') {
            if (!teacher.cnicFront) return res.status(404).json({ error: 'CNIC front not found' });
            filePathToDelete = teacher.cnicFront;
            updateData = { cnicFront: null };
        } else if (type === 'cnic-back') {
            if (!teacher.cnicBack) return res.status(404).json({ error: 'CNIC back not found' });
            filePathToDelete = teacher.cnicBack;
            updateData = { cnicBack: null };
        } else if (type === 'qualification') {
            const existingDocs = teacher.qualificationCertificates ? JSON.parse(teacher.qualificationCertificates) : [];
            const docIndex = parseInt(index) || 0;
            if (docIndex >= existingDocs.length) return res.status(404).json({ error: 'Document not found at specified index' });
            filePathToDelete = existingDocs[docIndex];
            existingDocs.splice(docIndex, 1);
            updateData = { qualificationCertificates: JSON.stringify(existingDocs) };
        } else if (type === 'experience') {
            const existingDocs = teacher.experienceCertificates ? JSON.parse(teacher.experienceCertificates) : [];
            const docIndex = parseInt(index) || 0;
            if (docIndex >= existingDocs.length) return res.status(404).json({ error: 'Document not found at specified index' });
            filePathToDelete = existingDocs[docIndex];
            existingDocs.splice(docIndex, 1);
            updateData = { experienceCertificates: JSON.stringify(existingDocs) };
        } else if (type === 'other') {
            const existingDocs = teacher.otherDocuments ? JSON.parse(teacher.otherDocuments) : [];
            const docIndex = parseInt(index) || 0;
            if (docIndex >= existingDocs.length) return res.status(404).json({ error: 'Document not found at specified index' });
            filePathToDelete = existingDocs[docIndex];
            existingDocs.splice(docIndex, 1);
            updateData = { otherDocuments: JSON.stringify(existingDocs) };
        } else {
            return res.status(400).json({ error: 'Invalid document type' });
        }

        if (filePathToDelete && fs.existsSync(filePathToDelete)) fs.unlinkSync(filePathToDelete);
        await prisma.teacher.update({ where: { id: teacherId }, data: updateData });

        res.json({ message: 'Document deleted successfully', deleted: { type, path: filePathToDelete } });
    } catch (error) {
        logger.error({ err: error }, 'Delete teacher document error');
        res.status(500).json({ error: 'Failed to delete document' });
    }
}

// Get teacher with all document info
async function getTeacherWithDocuments(req, res) {
    try {
        const { id } = req.params;

        const teacher = await prisma.teacher.findFirst({
            where: { OR: [{ id }, { userId: id }] },
            include: {
                user: {
                    select: {
                        id: true, name: true, email: true, phone: true,
                        profileImage: true, status: true, createdAt: true
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

        const generateFileUrl = (docType, tId, idx = null) => {
            let url = `/api/admin/teachers/${tId}/documents/${docType}`;
            if (idx !== null) url += `?index=${idx}`;
            return url;
        };

        const documentUrls = {
            profileImageUrl: generateFileUrl('profile-image', teacher.userId),
            cnicFrontUrl: teacher.cnicFront ? generateFileUrl('cnic-front', teacher.id) : null,
            cnicBackUrl: teacher.cnicBack ? generateFileUrl('cnic-back', teacher.id) : null,
            degreeDocumentsUrls: documents.degreeDocuments.map((_, idx) => generateFileUrl('degree', teacher.id, idx)),
            otherDocumentsUrls: documents.otherDocuments.map((_, idx) => generateFileUrl('other', teacher.id, idx)),
        };

        res.json({
            teacher: teacher.user,
            teacherRecordId: teacher.id,
            profile: {
                // Professional
                bio: teacher.bio,
                specialization: teacher.specialization,
                qualification: teacher.qualification,
                cnic: teacher.cnic,
                experience: teacher.experience,
                joiningDate: teacher.joiningDate,
                salary: teacher.salary,
                employmentType: teacher.employmentType,
                // Personal — these were missing
                dateOfBirth: teacher.dateOfBirth,
                gender: teacher.gender,
                phoneSecondary: teacher.phoneSecondary,
                address: teacher.address,
                bloodGroup: teacher.bloodGroup,
                medicalConditions: teacher.medicalConditions,
                // Emergency contact — these were missing
                emergencyContactName: teacher.emergencyContactName,
                emergencyContactPhone: teacher.emergencyContactPhone,
                emergencyContactRelation: teacher.emergencyContactRelation,
                // Bank details — these were missing
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

// Get student with all document info
async function getStudentWithDocuments(req, res) {
    try {
        const { id } = req.params;

        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, profileImage: true, status: true, createdAt: true },
                },
                currentEnrollment: {
                    include: { classRoom: { select: { name: true, grade: true, type: true } } },
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

        const generateFileUrl = (docType, sId, idx = null) => {
            let url = `/api/admin/students/${sId}/documents/${docType}`;
            if (idx !== null) url += `?index=${idx}`;
            return url;
        };

        const documentUrls = {
            profileImageUrl: `/api/admin/files/profile-image/${student.userId}`,
            birthCertificateUrl: student.birthCertificate ? generateFileUrl('birth-certificate', student.id) : null,
            cnicBformUrl: student.cnicOrBForm ? generateFileUrl('cnic-bform', student.id) : null,
            previousSchoolCertificateUrl: student.previousSchoolCertificate ? generateFileUrl('previous-school', student.id) : null,
            otherDocumentsUrls: documents.otherDocuments.map((_, idx) => generateFileUrl('other', student.id, idx)),
        };

        res.json({
            student: student.user,
            studentRecordId: student.id,
            profile: {
                admissionNo: student.admissionNo, dateOfBirth: student.dob,
                gender: student.gender, guardianName: student.guardianName,
                guardianPhone: student.guardianPhone, address: student.address,
                city: student.city, province: student.province,
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

// Export all user documents as JSON info
async function exportUserDocumentsInfo(req, res) {
    try {
        const { userId, userType } = req.params;

        let documents = [];
        let userInfo = {};

        if (userType === 'teacher') {
            const teacher = await prisma.teacher.findFirst({
                where: { userId },
                include: { user: { select: { name: true, email: true } } },
            });

            if (teacher) {
                userInfo = { type: 'teacher', name: teacher.user.name, email: teacher.user.email, teacherId: teacher.id };
                documents = [
                    { type: 'profile-image', path: teacher.profileImage, url: `/api/admin/files/profile-image/${userId}` },
                    { type: 'cnic-front', path: teacher.cnicFront, url: teacher.cnicFront ? `/api/admin/teachers/${teacher.id}/documents/cnic-front` : null },
                    { type: 'cnic-back', path: teacher.cnicBack, url: teacher.cnicBack ? `/api/admin/teachers/${teacher.id}/documents/cnic-back` : null },
                    ...(teacher.degreeDocuments ? JSON.parse(teacher.degreeDocuments).map((p, i) => ({
                        type: 'degree', index: i, path: p, url: `/api/admin/teachers/${teacher.id}/documents/degree?index=${i}`,
                    })) : []),
                    ...(teacher.otherDocuments ? JSON.parse(teacher.otherDocuments).map((p, i) => ({
                        type: 'other', index: i, path: p, url: `/api/admin/teachers/${teacher.id}/documents/other?index=${i}`,
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
                    type: 'student', name: student.user.name, email: student.user.email,
                    studentId: student.id, admissionNo: student.admissionNo,
                };
                documents = [
                    { type: 'profile-image', path: student.profileImage, url: `/api/admin/files/profile-image/${userId}` },
                    { type: 'birth-certificate', path: student.birthCertificate, url: student.birthCertificate ? `/api/admin/students/${student.id}/documents/birth-certificate` : null },
                    { type: 'cnic-bform', path: student.cnicOrBForm, url: student.cnicOrBForm ? `/api/admin/students/${student.id}/documents/cnic-bform` : null },
                    { type: 'previous-school', path: student.previousSchoolCertificate, url: student.previousSchoolCertificate ? `/api/admin/students/${student.id}/documents/previous-school` : null },
                    ...(student.otherDocuments ? JSON.parse(student.otherDocuments).map((p, i) => ({
                        type: 'other', index: i, path: p, url: `/api/admin/students/${student.id}/documents/other?index=${i}`,
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
