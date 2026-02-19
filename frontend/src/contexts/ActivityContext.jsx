import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import activityService from '../services/activity.service';
import { useAuth } from './AuthContext';

const ActivityContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};

export const ActivityProvider = ({ children }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });

  // Teacher-specific state
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [classroomSubjects, setClassroomSubjects] = useState([]);

  // Fetch teacher's classes
  const fetchTeacherClasses = useCallback(async () => {
    if (!user?.teacherProfile?.id) return;

    try {
      setLoading(true);
      const response = await activityService.getTeacherClasses(user.teacherProfile.id);
      
      if (response.success && response.data) {
        setTeacherClasses(response.data);
        
        // Auto-select first class if available and none selected
        if (response.data.length > 0 && !selectedClassroom) {
          setSelectedClassroom(response.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching teacher classes:', err);
      setError(err.response?.data?.error || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [user, selectedClassroom]);

  // Fetch students for selected classroom
  const fetchClassroomStudents = useCallback(async (classRoomId) => {
    if (!classRoomId) {
      setClassroomStudents([]);
      return;
    }

    try {
      setLoading(true);
      const response = await activityService.getClassroomStudents(classRoomId);
      
      if (response.success && response.data) {
        // Filter only REGULAR students as per backend requirement
        const regularStudents = response.data.filter(
          student => student.studentType === 'REGULAR'
        );
        setClassroomStudents(regularStudents);
      } else {
        setClassroomStudents([]);
      }
    } catch (err) {
      console.error('Error fetching classroom students:', err);
      setError(err.response?.data?.error || 'Failed to load students');
      setClassroomStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch subjects for selected classroom
  const fetchClassroomSubjects = useCallback(async (classRoomId) => {
    if (!classRoomId) {
      setClassroomSubjects([]);
      return;
    }

    try {
      const response = await activityService.getClassroomSubjects(classRoomId);
      
      if (response.success && response.data) {
        setClassroomSubjects(response.data);
      } else {
        setClassroomSubjects([]);
      }
    } catch (err) {
      console.error('Error fetching classroom subjects:', err);
      setClassroomSubjects([]);
    }
  }, []);

  // Fetch activities for selected student
  const fetchStudentActivities = useCallback(async (studentId, params = {}) => {
    if (!studentId) {
      setActivities([]);
      return;
    }

    try {
      setLoading(true);
      const response = await activityService.getStudentActivities(studentId, {
        ...params,
        limit: params.limit || 30,
        offset: params.offset || 0
      });
      
      if (response.success && response.data) {
        setActivities(response.data);
      } else {
        setActivities([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching student activities:', err);
      setError(err.response?.data?.error || 'Failed to load activities');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new activity
  const createActivity = async (activityData) => {
    try {
      // Validate data first
      const validation = activityService.validateActivityData(activityData);
      if (!validation.isValid) {
        const errorMsg = validation.errors.join(', ');
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setLoading(true);
      
      // Format data for backend
      const formattedData = activityService.formatActivityData(activityData);
      
      const response = await activityService.createActivity(formattedData);
      
      if (response.success && response.data) {
        // Add to local state (at beginning for newest first)
        setActivities(prev => [response.data, ...prev]);
        
        // Update classroom students list if this is a new student
        if (selectedClassroom && response.data.student) {
          const studentExists = classroomStudents.some(
            s => s.id === response.data.student.id
          );
          if (!studentExists) {
            setClassroomStudents(prev => [...prev, response.data.student]);
          }
        }
        
        setError(null);
        return response;
      } else {
        throw new Error(response.error || 'Failed to create activity');
      }
    } catch (err) {
      console.error('Error creating activity:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create activity';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update activity (endpoint not yet implemented in backend)
  const updateActivity = async (id, updateData) => {
    try {
      setLoading(true);
      const response = await activityService.updateActivity(id, updateData);
      
      if (response.success && response.data) {
        // Update in local state
        setActivities(prev => 
          prev.map(activity => 
            activity.id === id ? response.data : activity
          )
        );
        setError(null);
        return response;
      } else {
        throw new Error(response.error || 'Failed to update activity');
      }
    } catch (err) {
      console.error('Error updating activity:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update activity';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete activity (endpoint not yet implemented in backend)
  const deleteActivity = async (id) => {
    try {
      setLoading(true);
      const response = await activityService.deleteActivity(id);
      
      if (response.success) {
        // Remove from local state
        setActivities(prev => prev.filter(activity => activity.id !== id));
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to delete activity');
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete activity';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear all activities
  const clearActivities = () => {
    setActivities([]);
    setError(null);
  };

  // Get activity by ID from local state
  const getActivityById = (id) => {
    return activities.find(activity => activity.id === id);
  };

  // Get activities for a specific date
  const getActivitiesByDate = (date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === targetDate.getTime();
    });
  };

  // Get statistics
  const getStatistics = () => {
    if (activities.length === 0) return null;

    const totalActivities = activities.length;
    
    const uniqueDates = new Set(
      activities.map(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.toDateString();
      })
    ).size;
    
    // Calculate average ratings
    let totalParticipation = 0;
    let totalBehavior = 0;
    let totalDiscipline = 0;
    let count = 0;
    
    activities.forEach(a => {
      if (a.participationLevel) {
        totalParticipation += a.participationLevel;
        count++;
      }
      if (a.behaviorRating) {
        totalBehavior += a.behaviorRating;
      }
      if (a.disciplineScore) {
        totalDiscipline += a.disciplineScore;
      }
    });
    
    const avgParticipation = count > 0 ? totalParticipation / count : 0;
    const avgBehavior = activities.length > 0 ? totalBehavior / activities.length : 0;
    const avgDiscipline = activities.length > 0 ? totalDiscipline / activities.length : 0;
    
    // Count attendance statuses
    const attendanceStats = activities.reduce((acc, a) => {
      const status = a.attendanceStatus || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalActivities,
      uniqueDates,
      averageParticipation: Math.round(avgParticipation * 100) / 100,
      averageBehavior: Math.round(avgBehavior * 100) / 100,
      averageDiscipline: Math.round(avgDiscipline * 100) / 100,
      attendanceStats
    };
  };

  // Check if activity exists for student on date
  const checkActivityExists = (studentId, date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return activities.some(activity => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      return activity.studentId === studentId && 
             activityDate.getTime() === targetDate.getTime();
    });
  };

  // Effect to load teacher classes on mount
  useEffect(() => {
    if (user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      if (user.teacherProfile?.id) {
        fetchTeacherClasses();
      }
    }
  }, [user, fetchTeacherClasses]);

  // Effect to load students and subjects when classroom changes
  useEffect(() => {
    if (selectedClassroom?.id) {
      fetchClassroomStudents(selectedClassroom.id);
      fetchClassroomSubjects(selectedClassroom.id);
    } else {
      setClassroomStudents([]);
      setClassroomSubjects([]);
    }
  }, [selectedClassroom, fetchClassroomStudents, fetchClassroomSubjects]);

  // Effect to load activities when student changes
  useEffect(() => {
    if (selectedStudent?.id) {
      fetchStudentActivities(selectedStudent.id);
    } else {
      setActivities([]);
    }
  }, [selectedStudent, fetchStudentActivities]);

  const value = {
    // State
    activities,
    loading,
    error,
    selectedStudent,
    selectedClassroom,
    dateRange,
    teacherClasses,
    classroomStudents,
    classroomSubjects,
    
    // Setters
    setSelectedStudent,
    setSelectedClassroom,
    setDateRange,
    setError,
    
    // Actions
    fetchStudentActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    clearActivities,
    getActivityById,
    getActivitiesByDate,
    getStatistics,
    fetchTeacherClasses,
    fetchClassroomStudents,
    fetchClassroomSubjects,
    checkActivityExists,
    
    // Convenience flags
    hasActivities: activities.length > 0,
    isTeacher: user?.role === 'TEACHER',
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    canCreateActivity: user?.teacherProfile?.id && selectedClassroom?.id,
    
    // Read-only endpoints status (for UI feedback)
    endpointsStatus: {
      create: 'implemented',
      getStudent: 'pending',
      getClass: 'pending',
      getById: 'pending',
      update: 'pending',
      delete: 'pending'
    }
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};

export default ActivityContext;