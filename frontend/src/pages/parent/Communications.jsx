import { useEffect, useState } from 'react';
import { getCommunications, respondToCommunication } from '../../services/parentCommunication.service';

export default function Communications() {
  const [communications, setCommunications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    studentId: '',
    page: 1,
  });
  const [responseText, setResponseText] = useState({});
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    if (filters.studentId) {
      loadCommunications();
    }
  }, [filters]);

  const loadCommunications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCommunications(filters);
      setCommunications(response.data.communications);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (communicationId) => {
    const response = responseText[communicationId];
    if (!response || !response.trim()) return;

    setSubmitting(communicationId);
    try {
      await respondToCommunication(communicationId, response);
      setResponseText(prev => ({ ...prev, [communicationId]: '' }));
      loadCommunications();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmitting(null);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'PROGRESS_UPDATE': return '📊';
      case 'CONCERN_ALERT': return '⚠️';
      case 'ACHIEVEMENT': return '🏆';
      case 'MEETING_REQUEST': return '📅';
      default: return '💬';
    }
  };

  if (!filters.studentId) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">Please select a student to view communications</p>
        </div>
      </div>
    );
  }

  if (loading && communications.length === 0) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Teacher Communications</h1>
        <p className="text-sm text-gray-600 mt-1">Messages and updates from your child's teachers</p>
      </div>

      {communications.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📬</div>
          <p className="text-gray-600">No communications yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => (
            <div
              key={comm.id}
              className={`bg-white rounded-lg shadow overflow-hidden border-l-4 ${comm.acknowledged ? 'border-gray-300' : 'border-blue-500'
                }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{getTypeIcon(comm.communicationType)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-800">{comm.subject}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(comm.createdAt).toLocaleDateString()} at{' '}
                          {new Date(comm.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(comm.priority)}`}>
                          {comm.priority}
                        </span>
                        {!comm.acknowledged && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            New
                          </span>
                        )}
                        {comm.meetingRequested && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            Meeting Requested
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded">
                      <p className="text-gray-700 whitespace-pre-wrap">{comm.message}</p>
                    </div>

                    {comm.meetingScheduled && (
                      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded">
                        <p className="text-sm font-medium text-purple-800">
                          Meeting Scheduled: {new Date(comm.meetingScheduled).toLocaleDateString()} at{' '}
                          {new Date(comm.meetingScheduled).toLocaleTimeString()}
                        </p>
                      </div>
                    )}

                    {comm.parentResponse && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-800 mb-1">Your Response:</p>
                        <p className="text-sm text-green-700">{comm.parentResponse}</p>
                      </div>
                    )}

                    {!comm.acknowledged && (
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Your Response
                        </label>
                        <textarea
                          value={responseText[comm.id] || ''}
                          onChange={(e) => setResponseText(prev => ({ ...prev, [comm.id]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows="3"
                          placeholder="Type your response here..."
                        />
                        <button
                          onClick={() => handleRespond(comm.id)}
                          disabled={submitting === comm.id || !responseText[comm.id]?.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {submitting === comm.id ? 'Submitting...' : 'Send Response'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={!pagination.hasNext}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}