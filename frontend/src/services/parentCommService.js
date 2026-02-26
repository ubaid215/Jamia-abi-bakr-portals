// FILE: src/services/parentCommService.js
// PATTERN FROM: src/services/dailyActivityService.js (existing pattern)
// BACKEND CONTRACT:
//   backend/modules/parent-communication/parentComm.routes.js
//   backend/modules/parent-communication/parentComm.validator.js (request shapes)
//   backend/modules/parent-communication/parentComm.repository.js (response: commSelect)
//
// ENDPOINTS:
//   POST   /api/parent-communication               → Teacher/Admin creates communication
//   GET    /api/parent-communication               → List (role-scoped: teacher sees own, parent sees own)
//   PATCH  /api/parent-communication/:id           → Update (meetingScheduled, meetingCompleted, etc.)
//   PATCH  /api/parent-communication/:id/acknowledge → Parent acknowledges message
//
// RESPONSE SHAPE (from commSelect):
//   { id, studentId, parentId, teacherId, communicationType, subject, message,
//     relatedActivity, meetingRequested, meetingScheduled, meetingCompleted,
//     meetingNotes, parentResponse, parentResponseAt, acknowledged, sentVia,
//     deliveredAt, priority, isActive, createdAt, updatedAt,
//     student: { id, admissionNo, user: { name } },
//     teacher: { id, user: { name } },
//     parent: { id, user: { name, phone } } }
//
// PRIORITY VALUES: LOW | NORMAL | HIGH | URGENT

import api from './api';

const parentCommService = {
    // POST /api/parent-communication
    // Body: { studentId, parentId?, communicationType, subject, message,
    //         relatedActivity?, meetingRequested?, meetingScheduled?,
    //         priority?, sentVia? }
    // Auth: Teacher/Admin only
    create: async (data) => {
        const response = await api.post('/parent-communication', data);
        return response.data;
    },

    // GET /api/parent-communication  (paginated, role-scoped server-side)
    // Teachers see only their own. Parents see only their student's.
    // Query: { studentId?, teacherId?, parentId?, communicationType?, acknowledged?, page?, limit? }
    getAll: async (filters = {}) => {
        const response = await api.get('/parent-communication', { params: filters });
        return response.data;
    },

    // PATCH /api/parent-communication/:id
    // Update meeting details. Auth: Teacher/Admin only.
    // Body: { meetingScheduled?, meetingCompleted?, meetingNotes?, isActive? }
    update: async (id, data) => {
        const response = await api.patch(`/parent-communication/${id}`, data);
        return response.data;
    },

    // PATCH /api/parent-communication/:id/acknowledge
    // Parent acknowledges a communication. Auth: Parent/Admin only.
    // Body: { parentResponse? }
    acknowledge: async (id, parentResponse = null) => {
        const response = await api.patch(`/parent-communication/${id}/acknowledge`, {
            ...(parentResponse && { parentResponse }),
        });
        return response.data;
    },
};

export default parentCommService;
