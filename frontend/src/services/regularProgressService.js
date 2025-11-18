import api from './api';

const regularProgressService = {
  // Subject assessments
  recordSubjectAssessment: async (assessmentData) => {
    const response = await api.post('/regular-progress/assessments', assessmentData);
    return response.data;
  },

  // Monthly progress reports
  createMonthlyProgress: async (progressData) => {
    const response = await api.post('/regular-progress/monthly', progressData);
    return response.data;
  },

  // Study plans
  createStudyPlan: async (studyPlanData) => {
    const response = await api.post('/regular-progress/study-plans', studyPlanData);
    return response.data;
  },

  updateStudyPlanProgress: async (studyPlanId, progressData) => {
    const response = await api.put(`/regular-progress/study-plans/${studyPlanId}`, progressData);
    return response.data;
  },

  // Progress overview and reports
  getStudentProgressOverview: async (studentId) => {
    const response = await api.get(`/regular-progress/students/${studentId}/overview`);
    return response.data;
  },

  getClassProgressSummary: async (classRoomId) => {
    const response = await api.get(`/regular-progress/classes/${classRoomId}/summary`);
    return response.data;
  }
};

export default regularProgressService;