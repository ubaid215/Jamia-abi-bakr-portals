import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, BookOpen, Star, Clock, Edit } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';

const StudentDailyActivityView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getActivityById } = useActivity();
  
  // Get the activity by ID
  const activity = getActivityById(id);

  if (!activity) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Activity Not Found</h2>
          <p className="text-gray-600 mb-6">The requested activity could not be found.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Activities
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daily Activity Details</h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(activity.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                <span className="text-gray-600 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {activity.student?.user?.name}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                {activity.attendanceStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Ratings & Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Performance Ratings */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Performance Ratings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Participation</span>
                  <div className="flex items-center">
                    <Star className={`w-4 h-4 mr-1 ${getRatingColor(activity.participationLevel)}`} />
                    <span className={`font-medium ${getRatingColor(activity.participationLevel)}`}>
                      {activity.participationLevel}/5
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Behavior</span>
                  <div className="flex items-center">
                    <Star className={`w-4 h-4 mr-1 ${getRatingColor(activity.behaviorRating)}`} />
                    <span className={`font-medium ${getRatingColor(activity.behaviorRating)}`}>
                      {activity.behaviorRating}/5
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Discipline</span>
                  <div className="flex items-center">
                    <Star className={`w-4 h-4 mr-1 ${getRatingColor(activity.disciplineScore)}`} />
                    <span className={`font-medium ${getRatingColor(activity.disciplineScore)}`}>
                      {activity.disciplineScore}/5
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subjects Covered */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Subjects Covered</h3>
              <div className="space-y-2">
                {activity.subjectsStudied?.slice(0, 3).map((subject, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate">
                      {subject.subjectName || `Subject ${index + 1}`}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
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

            {/* Attendance & Hours */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Attendance Details</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="font-medium">{activity.attendanceStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Hours Spent</span>
                  <span className="font-medium">{activity.totalHoursSpent} hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Punctuality</span>
                  <span className={`font-medium ${activity.punctuality ? 'text-green-600' : 'text-red-600'}`}>
                    {activity.punctuality ? 'On Time' : 'Late'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Teacher Remarks & Feedback */}
          <div className="lg:col-span-2 space-y-6">
            {/* Teacher Remarks */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Edit className="w-4 h-4 mr-2" />
                Teacher Remarks
              </h3>
              {activity.teacherRemarks ? (
                <p className="text-gray-700 whitespace-pre-line">{activity.teacherRemarks}</p>
              ) : (
                <p className="text-gray-400 italic">No remarks provided</p>
              )}
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-3">Strengths</h3>
                {activity.strengths ? (
                  <p className="text-green-700">{activity.strengths}</p>
                ) : (
                  <p className="text-green-400 italic">No strengths noted</p>
                )}
              </div>
              
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-3">Areas for Improvement</h3>
                {activity.improvements ? (
                  <p className="text-yellow-700">{activity.improvements}</p>
                ) : (
                  <p className="text-yellow-400 italic">No improvements noted</p>
                )}
              </div>
            </div>

            {/* Subjects Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Subjects Studied Today
              </h3>
              <div className="space-y-3">
                {activity.subjectsStudied?.map((subject, index) => (
                  <div key={index} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {subject.subjectName || `Subject ${index + 1}`}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subject.understandingLevel >= 4 
                          ? 'bg-green-100 text-green-800'
                          : subject.understandingLevel >= 3
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        Understanding: {subject.understandingLevel}/5
                      </span>
                    </div>
                    
                    {subject.topicsCovered?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600 mb-1">Topics Covered:</p>
                        <div className="flex flex-wrap gap-1">
                          {subject.topicsCovered.map((topic, topicIndex) => (
                            <span 
                              key={topicIndex}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {subject.notes && (
                      <p className="text-sm text-gray-600 mt-1">{subject.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Recorded by: {activity.teacher?.user?.name}
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date(activity.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDailyActivityView;