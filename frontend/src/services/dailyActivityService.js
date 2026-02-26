// FILE: src/services/dailyActivityService.js
// PATTERN FROM: src/services/snapshotService.js (existing)
// BACKEND CONTRACT:
//   backend/modules/daily-activity/dailyActivity.routes.js
//   backend/modules/daily-activity/dailyActivity.validator.js (request shapes)
//   backend/modules/daily-activity/dailyActivity.repository.js (response shapes)
//
// FIXED:
//   - getByStudent: was /activities/student/:id → correct: GET /activities?studentId=:id
//   - getByClass:   was /activities/class/:id (non-existent) → correct: GET /activities?classRoomId=:id
//   - update:       was PUT → correct: PATCH (backend route is router.patch)
//   - getByStudentAndDate: added (was missing) — GET /activities/student/:studentId/date/:date
//   - list:         added (was missing) — GET /activities with query filters

import api from './api';

const dailyActivityService = {
    // POST /api/activities
    // Body: { studentId, classRoomId, subjectId?, date?, attendanceStatus, totalHoursSpent,
    //         subjectsStudied[], homeworkAssigned?, homeworkCompleted?, classworkCompleted?,
    //         participationLevel, assessmentsTaken?, behaviorRating, disciplineScore,
    //         punctuality, uniformCompliance, skillsSnapshot?, strengths?, improvements?,
    //         concerns?, teacherRemarks?, parentNotes? }
    // Auth: Teacher/Admin only. ensureStudentIsRegular runs server-side.
    create: async (data) => {
        const response = await api.post('/activities', data);
        return response.data;
    },

    // GET /api/activities  (paginated, role-scoped on server)
    // Query: { studentId?, classRoomId?, subjectId?, teacherId?,
    //          startDate?, endDate?, attendanceStatus?, page?, limit? }
    getAll: async (filters = {}) => {
        const response = await api.get('/activities', { params: filters });
        return response.data;
    },

    // GET /api/activities  ?studentId=:studentId  (convenience wrapper)
    getByStudent: async (studentId, filters = {}) => {
        const response = await api.get('/activities', { params: { ...filters, studentId } });
        return response.data;
    },

    // GET /api/activities  ?classRoomId=:classRoomId
    getByClass: async (classRoomId, filters = {}) => {
        const response = await api.get('/activities', { params: { ...filters, classRoomId } });
        return response.data;
    },

    // GET /api/activities/student/:studentId/date/:date
    // date must be YYYY-MM-DD format
    getByStudentAndDate: async (studentId, date) => {
        const response = await api.get(`/activities/student/${studentId}/date/${date}`);
        return response.data;
    },

    // GET /api/activities/:id
    getById: async (id) => {
        const response = await api.get(`/activities/${id}`);
        return response.data;
    },

    // PATCH /api/activities/:id  (NOT PUT — backend uses router.patch)
    // Body: any subset of activity fields (all optional, at least one required)
    // Auth: Teacher (own records) or Admin
    update: async (id, data) => {
        const response = await api.patch(`/activities/${id}`, data);
        return response.data;
    },

    // DELETE /api/activities/:id  — Admin only
    delete: async (id) => {
        const response = await api.delete(`/activities/${id}`);
        return response.data;
    },
};

export default dailyActivityService;
