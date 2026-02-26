// FILE: src/services/weeklyProgressService.js
// PATTERN FROM: src/services/snapshotService.js (existing)
// BACKEND CONTRACT:
//   backend/modules/weekly-progress/weeklyProgress.routes.js
//   backend/modules/weekly-progress/weeklyProgress.validator.js
//   backend/modules/weekly-progress/weeklyProgress.repository.js
//
// FIXED:
//   - generate:         was missing classRoomId → added required field
//   - bulkGenerate:     endpoint /bulk-generate doesn't exist → REMOVED
//   - getByStudent:     was /weekly-progress/student/:id → correct: GET /weekly-progress?studentId=:id
//   - getByClass:       was /weekly-progress/class/:id → correct: GET /weekly-progress?classRoomId=:id
//   - updateComments:   was PUT /:id/comments → correct: PATCH /:id
//   - getAtRisk:        was /weekly-progress/at-risk (doesn't exist) → REMOVED (at-risk is in /dashboard)
// ADDED:
//   - getCurrentWeek:   GET /weekly-progress/student/:studentId/current
//   - getByStudentAndWeek: GET /weekly-progress/student/:studentId/week/:weekNumber/year/:year
//   - getAll:           GET /weekly-progress with query filters

import api from './api';

const weeklyProgressService = {
    // POST /api/weekly-progress/generate
    // Body: { studentId, classRoomId, weekNumber?, year? }
    // Auth: Teacher/Admin only. ensureStudentIsRegular runs server-side.
    // NOTE: classRoomId is REQUIRED — backend needs it to store the progress record
    generate: async ({ studentId, classRoomId, weekNumber, year }) => {
        const response = await api.post('/weekly-progress/generate', {
            studentId,
            classRoomId,
            ...(weekNumber !== undefined && { weekNumber }),
            ...(year !== undefined && { year }),
        });
        return response.data;
    },

    // GET /api/weekly-progress  (paginated, role-scoped on server)
    // Query: { studentId?, classRoomId?, teacherId?, year?, weekNumber?, followUpRequired?, page?, limit? }
    getAll: async (filters = {}) => {
        const response = await api.get('/weekly-progress', { params: filters });
        return response.data;
    },

    // GET /api/weekly-progress  ?studentId=:studentId
    getByStudent: async (studentId, filters = {}) => {
        const response = await api.get('/weekly-progress', { params: { ...filters, studentId } });
        return response.data;
    },

    // GET /api/weekly-progress  ?classRoomId=:classRoomId
    getByClass: async (classRoomId, filters = {}) => {
        const response = await api.get('/weekly-progress', { params: { ...filters, classRoomId } });
        return response.data;
    },

    // GET /api/weekly-progress/student/:studentId/current
    // Returns the current ISO week's progress for the student
    getCurrentWeek: async (studentId) => {
        const response = await api.get(`/weekly-progress/student/${studentId}/current`);
        return response.data;
    },

    // GET /api/weekly-progress/student/:studentId/week/:weekNumber/year/:year
    getByStudentAndWeek: async (studentId, weekNumber, year) => {
        const response = await api.get(
            `/weekly-progress/student/${studentId}/week/${weekNumber}/year/${year}`
        );
        return response.data;
    },

    // PATCH /api/weekly-progress/:id  (NOT PUT — backend uses router.patch)
    // Only allows updating commentary fields:
    // { weeklyHighlights?, areasOfImprovement?, teacherComments?,
    //   achievements?, incidents?, actionItems?, followUpRequired? }
    // NOTE: Do NOT allow editing calculated metrics — they are server-computed
    update: async (id, data) => {
        const response = await api.patch(`/weekly-progress/${id}`, data);
        return response.data;
    },
};

export default weeklyProgressService;
