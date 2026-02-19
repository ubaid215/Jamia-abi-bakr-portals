/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Calendar, User, BookOpen, Star, Clock, Filter, ChevronDown, ChevronUp, Edit, Trash2, Eye, Download, Search } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';
import DateRangePicker from '../../components/shared/DateRangePicker';
import StudentSelector from '../../components/shared/StudentSelector';
import ClassroomSelector from '../../components/shared/ClassroomSelector';
import toast from 'react-hot-toast';

const DailyActivityList = ({ onEdit, onView, mode = 'teacher' }) => {
  const { 
    activities, 
    loading, 
    fetchStudentActivities, 
    deleteActivity,
    selectedStudent,
    setSelectedStudent,
    selectedClassroom,
    setSelectedClassroom,
    dateRange,
    setDateRange,
    clearActivities 
  } = useActivity();

  const [expandedActivity, setExpandedActivity] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  // Apply filters and sorting
  const filteredActivities = activities
    .filter(activity => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          activity.student?.user?.name?.toLowerCase().includes(term) ||
          activity.teacherRemarks?.toLowerCase().includes(term) ||
          activity.strengths?.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .filter(activity => {
      // Status filter
      if (filterStatus === 'with_homework') {
        return activity.homeworkAssigned?.length > 0;
      }
      if (filterStatus === 'with_assessments') {
        return activity.assessmentsTaken?.length > 0;
      }
      if (filterStatus === 'needs_attention') {
        return activity.behaviorRating < 3 || activity.participationLevel < 3;
      }
      return true;
    })
    .sort((a, b) => {
      // Sorting
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.date) - new Date(b.date);
        case 'date_desc':
          return new Date(b.date) - new Date(a.date);
        case 'rating_desc':
          return (b.behaviorRating + b.participationLevel) - (a.behaviorRating + a.participationLevel);
        case 'rating_asc':
          return (a.behaviorRating + a.participationLevel) - (b.behaviorRating + b.participationLevel);
        default:
          return 0;
      }
    });

  // Load activities based on filters
  useEffect(() => {
    if (selectedStudent?.id) {
      const params = {};
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = dateRange.startDate.toISOString();
        params.endDate = dateRange.endDate.toISOString();
      }
      fetchStudentActivities(selectedStudent.id, params);
    }
  }, [selectedStudent, dateRange, fetchStudentActivities]);

  const handleDelete = async (id, studentName) => {
    if (confirm(`Are you sure you want to delete this activity record for ${studentName}?`)) {
      try {
        await deleteActivity(id);
        toast.success('Activity deleted successfully');
      } catch (error) {
        toast.error('Failed to delete activity');
      }
    }
  };

  const handleExport = () => {
    // Export functionality
    const dataStr = JSON.stringify(activities, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `daily-activities-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Activities exported successfully');
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBg = (rating) => {
    if (rating >= 4) return 'bg-green-100';
    if (rating >= 3) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-6 h-6 mr-2 text-yellow-600" />
              Daily Activities
            </h2>
            <p className="text-gray-600 mt-1">
              View and manage student daily activity records
            </p>
          </div>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center">
            <Filter className="w-4 h-4 mr-2 text-yellow-600" />
            Filters & Search
          </h3>
          <span className="text-sm text-gray-500">
            {filteredActivities.length} record{filteredActivities.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <StudentSelector
              value={selectedStudent}
              onChange={setSelectedStudent}
              label="Filter by Student"
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div>
            <ClassroomSelector
              value={selectedClassroom}
              onChange={setSelectedClassroom}
              label="Filter by Classroom"
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
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="rating_desc">Highest Rating</option>
              <option value="rating_asc">Lowest Rating</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Activities
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name, remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="all">All Activities</option>
              <option value="with_homework">With Homework</option>
              <option value="with_assessments">With Assessments</option>
              <option value="needs_attention">Needs Attention</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activities...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredActivities.length === 0 && (
        <div className="py-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {selectedStudent 
              ? `No activities found for ${selectedStudent.user?.name}. Try adjusting your filters or date range.`
              : 'No activities found. Select a student to view their activities.'}
          </p>
          {selectedStudent && (
            <button
              onClick={() => {
                setDateRange({ startDate: new Date(), endDate: new Date() });
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="mt-4 px-4 py-2 text-yellow-600 hover:text-yellow-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Activities List */}
      {!loading && filteredActivities.length > 0 && (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const isExpanded = expandedActivity === activity.id;
            const totalSubjects = activity.subjectsStudied?.length || 0;
            const totalHomework = (activity.homeworkAssigned?.length || 0) + (activity.homeworkCompleted?.length || 0);
            
            return (
              <div 
                key={activity.id}
                className="border border-gray-200 rounded-lg hover:border-yellow-300 transition-colors"
              >
                {/* Activity Header */}
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}>
                  <div className="flex-1 flex items-center space-x-4">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${getRatingBg((activity.behaviorRating + activity.participationLevel) / 2)}
                    `}>
                      <Calendar className={`w-5 h-5 ${getRatingColor((activity.behaviorRating + activity.participationLevel) / 2)}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {activity.student?.user?.name}
                          </h4>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-sm text-gray-600 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(activity.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="text-sm text-gray-600 flex items-center">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {totalSubjects} subject{totalSubjects !== 1 ? 's' : ''}
                            </span>
                            {totalHomework > 0 && (
                              <span className="text-sm text-yellow-600 flex items-center">
                                <Star className="w-3 h-3 mr-1" />
                                {totalHomework} assignment{totalHomework !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right hidden md:block">
                            <div className="text-sm text-gray-600">Average Rating</div>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className={`font-medium ${getRatingColor((activity.behaviorRating + activity.participationLevel) / 2)}`}>
                                {((activity.behaviorRating + activity.participationLevel) / 2).toFixed(1)}
                              </span>
                              <span className="text-gray-400 ml-1">/5</span>
                            </div>
                          </div>
                          
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      {/* Ratings Summary */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-900">Performance Ratings</h5>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Participation</span>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="font-medium">{activity.participationLevel}/5</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Behavior</span>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="font-medium">{activity.behaviorRating}/5</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Discipline</span>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="font-medium">{activity.disciplineScore}/5</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subjects Summary */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Subjects Covered</h5>
                        <div className="space-y-2">
                          {activity.subjectsStudied?.slice(0, 3).map((subject, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 truncate">
                                {subject.subjectName || `Subject ${index + 1}`}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                {subject.topicsCovered?.length || 0} topics
                              </span>
                            </div>
                          ))}
                          {activity.subjectsStudied?.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{activity.subjectsStudied.length - 3} more subjects
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Teacher Remarks */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Teacher Remarks</h5>
                        {activity.teacherRemarks ? (
                          <p className="text-sm text-gray-600 line-clamp-3">{activity.teacherRemarks}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No remarks</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-500">
                        Recorded by: {activity.teacher?.user?.name}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onView?.(activity)}
                          className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </button>
                        
                        {mode === 'teacher' && (
                          <>
                            <button
                              onClick={() => onEdit?.(activity)}
                              className="px-3 py-1.5 text-sm text-yellow-600 hover:text-yellow-700 flex items-center"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </button>
                            
                            <button
                              onClick={() => handleDelete(activity.id, activity.student?.user?.name)}
                              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 flex items-center"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyActivityList;