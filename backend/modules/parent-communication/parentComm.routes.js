/**
 * modules/parent-communication/parentComm.routes.js
 * Mounted at /api/parent-communication
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireTeacherOrAdmin, requireParentOrAdmin, requireStudentTeacherOrAdmin } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validateRequest');
const controller = require('./parentComm.controller');
const { createCommSchema, updateCommSchema, acknowledgeSchema, listCommSchema } = require('./parentComm.validator');

router.post('/', authenticateToken, requireTeacherOrAdmin, validate(createCommSchema), controller.createCommunication);
router.get('/', authenticateToken, requireStudentTeacherOrAdmin, validate(listCommSchema), controller.listCommunications);
router.patch('/:id', authenticateToken, requireTeacherOrAdmin, validate(updateCommSchema), controller.updateCommunication);
router.patch('/:id/acknowledge', authenticateToken, requireParentOrAdmin, validate(acknowledgeSchema), controller.parentAcknowledge);

module.exports = router;