// FILE: src/services/snapshotService.js
// PATTERN FROM: src/services/snapshotService.js (existing, rewriting)
// BACKEND CONTRACT:
//   backend/modules/progress-snapshot/snapshot.routes.js
//   backend/modules/progress-snapshot/snapshot.repository.js (response shape: snapshotSelect)
//
// FIXED:
//   - recalculate:     was POST /dashboard/recalculate/:id (non-existent)
//                      → correct: POST /dashboard/student/:studentId/refresh
//   - bulkRecalculate: was POST /dashboard/bulk-recalculate (non-existent)
//                      → correct: POST /dashboard/classroom/:classRoomId/refresh

import api from './api';

const snapshotService = {
    // GET /api/dashboard/student/:studentId
    // Returns full StudentProgressSnapshot with student.user.name, classRoom, riskLevel, etc.
    // Auth: Student (own), Teacher/Admin
    getSnapshot: async (studentId) => {
        const response = await api.get(`/dashboard/student/${studentId}`);
        return response.data;
    },

    // POST /api/dashboard/student/:studentId/refresh
    // Triggers a manual snapshot recalculation.
    // Auth: Teacher/Admin only
    refresh: async (studentId) => {
        const response = await api.post(`/dashboard/student/${studentId}/refresh`);
        return response.data;
    },

    // POST /api/dashboard/classroom/:classRoomId/refresh
    // Bulk-refreshes snapshots for all REGULAR students in a classroom.
    // Auth: Teacher/Admin only
    refreshClassroom: async (classRoomId) => {
        const response = await api.post(`/dashboard/classroom/${classRoomId}/refresh`);
        return response.data;
    },

    // GET /api/dashboard/at-risk
    // Returns students with needsAttention=true, ordered by riskLevel desc
    // Auth: Teacher/Admin only
    getAtRisk: async (filters = {}) => {
        const response = await api.get('/dashboard/at-risk', { params: filters });
        return response.data;
    },
};

export default snapshotService;
