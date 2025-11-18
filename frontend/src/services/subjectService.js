import api from './api';

const subjectService = {
  // Create a new subject
  createSubject: async (subjectData) => {
    const response = await api.post('/subjects', subjectData);
    return response.data;
  },

  // Get all subjects
  getSubjects: async () => {
    const response = await api.get('/subjects');
    return response.data;
  },

  // Get subjects by class
  getClassSubjects: async (classId) => {
    const response = await api.get(`/subjects/class/${classId}`);
    return response.data;
  },

  // Get subject by ID
  getSubjectById: async (id) => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  },

  // Update subject
  updateSubject: async (id, subjectData) => {
    const response = await api.put(`/subjects/${id}`, subjectData);
    return response.data;
  },

  // Delete subject
  deleteSubject: async (id) => {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  },

  // Assign teacher to subject
  assignTeacherToSubject: async (subjectId, teacherId) => {
    const response = await api.post(`/subjects/${subjectId}/assign-teacher`, { teacherId });
    return response.data;
  }
};

export default subjectService;