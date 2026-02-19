/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Calendar, Users, TrendingUp, AlertCircle, Filter, Download, BarChart3, UserCheck, Clock } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';
import ClassroomSelector from '../../components/shared/ClassroomSelector';
import DateRangePicker from '../../components/shared/DateRangePicker';
import toast from 'react-hot-toast';

const ClassActivityView = () => {
  const { 
    activities, 
    loading, 
    teacherClasses, 
    selectedClassroom, 
    setSelectedClassroom,
    dateRange,
    setDateRange,
    classroomStudents,
    fetchClassroomStudents 
  } = useActivity();

  const [filterByStudent, setFilterByStudent] = useState('all');
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'detailed', 'calendar'

  // Load students when classroom changes
  useEffect(() => {
    if (selectedClassroom?.id) {
      fetchClassroomStudents(selectedClassroom.id);
    }
  }, [selectedClassroom, fetchClassroomStudents]);

  // Filter activities for selected classroom
  const classActivities = activities.filter(activity => 
    activity.classRoomId === selectedClassroom?.id
  );

  // Get statistics
  const getStatistics = () => {
    if (classActivities.length === 0) return null;

    const totalActivities = classActivities.length;
    const uniqueDates = [...new Set(classActivities.map(a => new Date(a.date).toDateString()))].length;
    const totalStudents = [...new Set(classActivities.map(a => a.studentId))].length;
    
    // Average ratings
    const avgParticipation = classActivities.reduce((sum, a) => sum + (a.participationLevel || 3), 0) / totalActivities;
    const avgBehavior = classActivities.reduce((sum, a) => sum + (a.behaviorRating || 3), 0) / totalActivities;
    const avgDiscipline = classActivities.reduce((sum, a) => sum + (a.disciplineScore || 3), 0) / totalActivities;

    // Students needing attention
    const needsAttention = classActivities.filter(a => 
      (a.behaviorRating < 3 || a.participationLevel < 3) && 
      new Date(a.date).toDateString() === new Date().toDateString()
    ).length;

    return {
      totalActivities,
      uniqueDates,
      totalStudents,
      avgParticipation: Math.round(avgParticipation * 100) / 100,
      avgBehavior: Math.round(avgBehavior * 100) / 100,
      avgDiscipline: Math.round(avgDiscipline * 100) / 100,
      needsAttention
    };
  };

  const stats = getStatistics();

  // Get activities by date
  const getActivitiesByDate = () => {
    const activitiesByDate = {};
    
    classActivities.forEach(activity => {
      const dateStr = new Date(activity.date).toDateString();
      if (!activitiesByDate[dateStr]) {
        activitiesByDate[dateStr] = {
          date: activity.date,
          activities: [],
          students: new Set(),
          avgRating: 0
        };
      }
      activitiesByDate[dateStr].activities.push(activity);
      activitiesByDate[dateStr].students.add(activity.studentId);
    });

    // Calculate averages
    Object.values(activitiesByDate).forEach(day => {
      const totalRating = day.activities.reduce((sum, a) => 
        sum + (a.participationLevel + a.behaviorRating + a.disciplineScore) / 3, 0
      );
      day.avgRating = Math.round((totalRating / day.activities.length) * 100) / 100;
    });

    return Object.values(activitiesByDate).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Get student performance
  const getStudentPerformance = () => {
    const studentMap = new Map();

    classActivities.forEach(activity => {
      if (!studentMap.has(activity.studentId)) {
        studentMap.set(activity.studentId, {
          student: activity.student,
          activities: [],
          avgParticipation: 0,
          avgBehavior: 0,
          lastActivity: null
        });
      }
      
      const studentData = studentMap.get(activity.studentId);
      studentData.activities.push(activity);
      
      if (!studentData.lastActivity || new Date(activity.date) > new Date(studentData.lastActivity)) {
        studentData.lastActivity = activity.date;
      }
    });

    // Calculate averages
    studentMap.forEach((data, studentId) => {
      if (data.activities.length > 0) {
        data.avgParticipation = Math.round(
          data.activities.reduce((sum, a) => sum + a.participationLevel, 0) / data.activities.length * 100
        ) / 100;
        
        data.avgBehavior = Math.round(
          data.activities.reduce((sum, a) => sum + a.behaviorRating, 0) / data.activities.length * 100
        ) / 100;
        
        data.activityCount = data.activities.length;
      }
    });

    return Array.from(studentMap.values()).sort((a, b) => b.activities.length - a.activities.length);
  };

  const handleExport = () => {
    const data = {
      classroom: selectedClassroom,
      dateRange,
      statistics: stats,
      activities: classActivities
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `class-activities-${selectedClassroom?.name || 'class'}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Class activities exported successfully');
  };

  const activitiesByDate = getActivitiesByDate();
  const studentPerformance = getStudentPerformance();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-2 text-yellow-600" />
              Class Activity Overview
            </h2>
            <p className="text-gray-600 mt-1">
              Monitor and analyze class-wide daily activities
            </p>
          </div>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <ClassroomSelector
              value={selectedClassroom}
              onChange={setSelectedClassroom}
              label="Select Classroom"
              required
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div>
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
              label="Date Range"
              disabled={loading || !selectedClassroom}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              disabled={!selectedClassroom}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="overview">Overview</option>
              <option value="detailed">Detailed View</option>
              <option value="calendar">Calendar View</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading class data...</p>
        </div>
      )}

      {/* No Classroom Selected */}
      {!loading && !selectedClassroom && (
        <div className="py-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Classroom</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Please select a classroom to view class activity overview and statistics.
          </p>
        </div>
      )}

      {/* No Activities */}
      {!loading && selectedClassroom && classActivities.length === 0 && (
        <div className="py-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Recorded</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            No daily activities have been recorded for {selectedClassroom.name} in the selected date range.
          </p>
        </div>
      )}

      {/* Class Overview */}
      {!loading && selectedClassroom && classActivities.length > 0 && viewMode === 'overview' && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalActivities}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.uniqueDates} day{stats.uniqueDates !== 1 ? 's' : ''} of activity
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Students Active</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                of {classroomStudents.length} total students
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Participation</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgParticipation}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                out of 5 rating
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Need Attention</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.needsAttention}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                students today
              </p>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-yellow-600" />
              Recent Activities
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {activitiesByDate.slice(0, 5).map((day, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="font-medium">{day.avgRating}</span>
                        <span className="text-gray-400 ml-1">/5</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{day.activities.length} activities</span>
                      <span>{day.students.size} students</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Performance */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-yellow-600" />
              Student Performance Ranking
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activities
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Participation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Behavior
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentPerformance.slice(0, 10).map((student, index) => (
                      <tr key={student.student?.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {student.student?.user?.name}
                            </div>
                            {index < 3 && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                Top {index + 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{student.activityCount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm text-gray-900 font-medium">{student.avgParticipation}</div>
                            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-yellow-600 h-2 rounded-full"
                                style={{ width: `${(student.avgParticipation / 5) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm text-gray-900 font-medium">{student.avgBehavior}</div>
                            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(student.avgBehavior / 5) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.lastActivity ? 
                            new Date(student.lastActivity).toLocaleDateString() : 
                            'N/A'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClassActivityView;