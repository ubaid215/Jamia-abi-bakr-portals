// FILE: src/services/parentCommunication.service.js
// PURPOSE: Named-export wrapper around parentCommService.js
// REQUIRED BY: src/pages/parent/Communications.jsx
//   which imports: { getCommunications, respondToCommunication }
// BACKEND CONTRACT: backend/modules/parent-communication/parentComm.routes.js
//   GET  /api/parent-communication   — list (role-scoped)
//   PATCH /api/parent-communication/:id/acknowledge — parent acknowledges

import api from './api';

// GET /api/parent-communication  ?studentId=:id&page=:p
export const getCommunications = async (filters = {}) => {
    const response = await api.get('/parent-communication', { params: filters });
    return response.data;
};

// PATCH /api/parent-communication/:id/acknowledge  { parentResponse? }
// Called when parent clicks "Send Response" button
export const respondToCommunication = async (id, parentResponse) => {
    const response = await api.patch(`/parent-communication/${id}/acknowledge`, {
        ...(parentResponse && { parentResponse }),
    });
    return response.data;
};

// POST /api/parent-communication — Teacher/Admin creates a communication
export const createCommunication = async (data) => {
    const response = await api.post('/parent-communication', data);
    return response.data;
};

// PATCH /api/parent-communication/:id — Teacher updates meeting details
export const updateCommunication = async (id, data) => {
    const response = await api.patch(`/parent-communication/${id}`, data);
    return response.data;
};

// Default export for convenience
const parentCommunicationService = {
    getCommunications,
    respondToCommunication,
    createCommunication,
    updateCommunication,
};
export default parentCommunicationService;
