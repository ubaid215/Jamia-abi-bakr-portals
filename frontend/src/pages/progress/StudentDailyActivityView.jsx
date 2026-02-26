import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, BookOpen, Star, Clock, Edit, Loader } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';
import dailyActivityService from '../../services/dailyActivityService';

const StudentDailyActivityView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getActivityById } = useActivity();

  // Try local state first, then fall back to API fetch
  const localActivity = getActivityById ? getActivityById(id) : null;
  const [activity, setActivity] = useState(localActivity || null);
  const [loading, setLoading] = useState(!localActivity);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If not in local state, fetch from API — GET /api/activities/:id
    if (!localActivity && id) {
      const fetch = async () => {
        try {
          const res = await dailyActivityService.getById(id);
          setActivity(res.data);
        } catch (err) {
          setError(err.response?.data?.error || 'Activity not found');
        } finally {
          setLoading(false);
        }
      };
      fetch();
    }
  }, [id, localActivity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size={32} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Activity Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested activity could not be found.'}</p>
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
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
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
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Performance Ratings */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Performance Ratings</h3>
              <div className="space-y-3">
                {[
                  ['Participation', activity.participationLevel],
                  ['Behavior', activity.behaviorRating],
                  ['Discipline', activity.disciplineScore],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-gray-600">{label}</span>
                    <div className="flex items-center">
                      <Star className={`w-4 h-4 mr-1 ${getRatingColor(val)}`} />
                      <span className={`font-medium ${getRatingColor(val)}`}>{val}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Attendance Details</h3>
              <div className="space-y-2 text-sm">
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Uniform</span>
                  <span className={`font-medium ${activity.uniformCompliance ? 'text-green-600' : 'text-red-600'}`}>
                    {activity.uniformCompliance ? 'Compliant' : 'Non-compliant'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
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
                <h3 className="font-medium text-green-800 mb-2">Strengths</h3>
                {activity.strengths
                  ? <p className="text-green-700 text-sm">{activity.strengths}</p>
                  : <p className="text-green-400 italic text-sm">No strengths noted</p>}
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">Areas for Improvement</h3>
                {activity.improvements
                  ? <p className="text-yellow-700 text-sm">{activity.improvements}</p>
                  : <p className="text-yellow-400 italic text-sm">No improvements noted</p>}
              </div>
            </div>

            {/* Subjects Studied */}
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
                        {subject.subjectName || subject.subject?.name || `Subject ${index + 1}`}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${subject.understandingLevel >= 4 ? 'bg-green-100 text-green-800' :
                          subject.understandingLevel >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        Understanding: {subject.understandingLevel}/5
                      </span>
                    </div>
                    {subject.topicsCovered?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subject.topicsCovered.map((topic, ti) => (
                          <span key={ti} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                    {subject.notes && (
                      <p className="text-sm text-gray-500 mt-1.5 italic">{subject.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Recorded by: {activity.teacher?.user?.name}</span>
            <span>Last updated: {new Date(activity.updatedAt || activity.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDailyActivityView;