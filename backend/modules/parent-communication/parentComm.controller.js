/**
 * modules/parent-communication/parentComm.controller.js
 */

const service = require('./parentComm.service');
const { sendSuccess, sendCreated, sendPaginated } = require('../../shared/utils/response.utils');

const createCommunication = async (req, res, next) => {
  try {
    const comm = await service.createCommunication(req.body, req.user, req);
    return sendCreated(res, comm, 'Communication sent successfully');
  } catch (err) { next(err); }
};

const updateCommunication = async (req, res, next) => {
  try {
    const comm = await service.updateCommunication(req.params.id, req.body, req.user, req);
    return sendSuccess(res, comm, 'Communication updated');
  } catch (err) { next(err); }
};

const parentAcknowledge = async (req, res, next) => {
  try {
    const comm = await service.parentAcknowledge(req.params.id, req.user.id, req.body.parentResponse);
    return sendSuccess(res, comm, 'Acknowledged');
  } catch (err) { next(err); }
};

const listCommunications = async (req, res, next) => {
  try {
    const { items, total, page, limit } = await service.listCommunications(req.query, req.user);
    return sendPaginated(res, items, { page, limit, total });
  } catch (err) { next(err); }
};

module.exports = { createCommunication, updateCommunication, parentAcknowledge, listCommunications };