import api from './api';

const classService = {
  // Create a new class
  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  // Get all classes
  getClasses: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  // Get class by ID
  getClassById: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  // Update class
  updateClass: async (id, classData) => {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },

  // Delete class
  deleteClass: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },

  // Assign teacher to class 
  assignTeacher: async (classId, teacherId) => {
    const response = await api.post(`/classes/${classId}/assign-teacher`, { teacherId });
    return response.data;
  },

  // Get class students
  getClassStudents: async (classId) => {
    const response = await api.get(`/classes/${classId}/students`);
    return response.data;
  },

  // Get class subjects
  getClassSubjects: async (classId) => {
    const response = await api.get(`/subjects/class/${classId}`);
    return response.data;
  }
};

export default classService;