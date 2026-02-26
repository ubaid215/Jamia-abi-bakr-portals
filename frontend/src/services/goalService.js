// FILE: src/services/goalService.js
// PATTERN FROM: src/services/dailyActivityService.js (existing pattern)
// BACKEND CONTRACT:
//   backend/modules/student-goals/goals.routes.js
//   backend/modules/student-goals/goals.validator.js (request shapes)
//   backend/modules/student-goals/goals.repository.js (response: goalSelect)
//
// FIXED:
//   - getByStudent:    was /goals/student/:id (non-existent) → correct: GET /goals?studentId=:id
//   - getByTeacher:    was /goals/teacher/:id (non-existent) → correct: GET /goals?teacherId=:id
//   - update:          was PUT → correct: PATCH
//   - updateProgress:  was PUT /:id/progress (non-existent) → correct: PATCH /:id with {currentValue}
//   - achieve:         was PUT /:id/achieve (non-existent) → correct: PATCH /:id with {status:'ACHIEVED'}
// REMOVED (endpoints don't exist in backend):
//   - getOverdue (/goals/overdue)
//   - getStats (/goals/stats)
// ADDED:
//   - getAll(filters)  — GET /goals with query params
//   - getById(id)      — GET /goals/:id
//   - deleteGoal(id)   — DELETE /goals/:id (Admin only)
//
// RESPONSE SHAPE (from goalSelect):
//   { id, studentId, teacherId, goalType, category, title, description,
//     metric, targetValue, currentValue, baselineValue, unit,
//     startDate, targetDate, status, achievedAt, progress, milestones,
//     lastChecked, checkFrequency, supportActions, visibleToStudent, visibleToParent,
//     createdAt, updatedAt,
//     student: { id, admissionNo, user: { name } },
//     teacher: { id, user: { name } } }
//
// STATUS VALUES: IN_PROGRESS | ACHIEVED | AT_RISK | FAILED | CANCELLED
// checkFrequency VALUES: DAILY | WEEKLY | MONTHLY

import api from './api';

const goalService = {
    // POST /api/goals
    // Body: { studentId, goalType, category?, title, description?, metric, targetValue,
    //         currentValue?, unit, startDate, targetDate, milestones?, checkFrequency?,
    //         visibleToStudent?, visibleToParent?, supportActions? }
    // Auth: Teacher/Admin only. ensureStudentIsRegular runs server-side.
    create: async (data) => {
        const response = await api.post('/goals', data);
        return response.data;
    },

    // GET /api/goals  (paginated, role-scoped server-side)
    // Query: { studentId?, teacherId?, status?, goalType?, page?, limit? }
    // Student sees only visibleToStudent=true goals; Parent sees only visibleToParent=true
    getAll: async (filters = {}) => {
        const response = await api.get('/goals', { params: filters });
        return response.data;
    },

    // GET /api/goals  ?studentId=:studentId
    getByStudent: async (studentId, filters = {}) => {
        const response = await api.get('/goals', { params: { ...filters, studentId } });
        return response.data;
    },

    // GET /api/goals  ?teacherId=:teacherId
    getByTeacher: async (teacherId, filters = {}) => {
        const response = await api.get('/goals', { params: { ...filters, teacherId } });
        return response.data;
    },

    // GET /api/goals/:id
    getById: async (id) => {
        const response = await api.get(`/goals/${id}`);
        return response.data;
    },

    // PATCH /api/goals/:id  (NOT PUT — backend uses router.patch)
    // Body: { currentValue?, targetValue?, status?, title?, description?,
    //         targetDate?, milestones?, supportActions?, visibleToStudent?, visibleToParent? }
    // NOTE: server auto-recalculates `progress` from currentValue/targetValue
    // NOTE: server auto-marks status=ACHIEVED when progress >= 100
    update: async (id, data) => {
        const response = await api.patch(`/goals/${id}`, data);
        return response.data;
    },

    // Convenience: update only currentValue → PATCH /goals/:id
    updateProgress: async (id, currentValue) => {
        const response = await api.patch(`/goals/${id}`, { currentValue });
        return response.data;
    },

    // Convenience: mark as ACHIEVED → PATCH /goals/:id  {status:'ACHIEVED'}
    markAchieved: async (id) => {
        const response = await api.patch(`/goals/${id}`, { status: 'ACHIEVED' });
        return response.data;
    },

    // DELETE /api/goals/:id  — Admin only
    deleteGoal: async (id) => {
        const response = await api.delete(`/goals/${id}`);
        return response.data;
    },
};

export default goalService;
