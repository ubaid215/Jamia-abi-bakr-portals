/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Save, Calendar, Clock, BookOpen, CheckSquare, Star, AlertCircle, Plus, X } from 'lucide-react';
import { useActivity } from '../../contexts/ActivityContext';
import StudentSelector from '../../components/shared/StudentSelector';
import ClassroomSelector from '../../components/shared/ClassroomSelector';
import SubjectSelector from '../../components/shared/SubjectSelector';
import RatingInput from '../../components/shared/RatingInput';
import JsonInputField from '../../components/shared/JsonInputField';
import toast from 'react-hot-toast';

const DailyActivityForm = ({ onSuccess, initialData = null, isEditing = false }) => {
  const { createActivity, updateActivity, classroomStudents, selectedClassroom, teacherClasses } = useActivity();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    studentId: initialData?.studentId || '',
    classRoomId: initialData?.classRoomId || '',
    subjectId: initialData?.subjectId || '',
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    attendanceId: initialData?.attendanceId || '',
    subjectsStudied: initialData?.subjectsStudied || [],
    homeworkAssigned: initialData?.homeworkAssigned || [],
    homeworkCompleted: initialData?.homeworkCompleted || [],
    classworkCompleted: initialData?.classworkCompleted || [],
    participationLevel: initialData?.participationLevel || 3,
    assessmentsTaken: initialData?.assessmentsTaken || [],
    behaviorRating: initialData?.behaviorRating || 3,
    disciplineScore: initialData?.disciplineScore || 3,
    skillsSnapshot: initialData?.skillsSnapshot || {},
    strengths: initialData?.strengths || '',
    improvements: initialData?.improvements || '',
    concerns: initialData?.concerns || '',
    teacherRemarks: initialData?.teacherRemarks || '',
    parentNotes: initialData?.parentNotes || ''
  });

  // Subjects available for selected classroom
  const [subjects, setSubjects] = useState([]);

  // Initialize form
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  // Load subjects when classroom changes
  useEffect(() => {
    if (formData.classRoomId && teacherClasses) {
      const classroom = teacherClasses.find(c => c.id === formData.classRoomId);
      if (classroom && classroom.subjects) {
        setSubjects(classroom.subjects);
      }
    }
  }, [formData.classRoomId, teacherClasses]);

  // Handle form changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Subjects Studied Management
  const [newSubject, setNewSubject] = useState({
    subjectId: '',
    topicsCovered: [],
    understandingLevel: 3,
    notes: ''
  });

  const handleAddSubject = () => {
    if (!newSubject.subjectId) {
      toast.error('Please select a subject');
      return;
    }
    if (newSubject.topicsCovered.length === 0) {
      toast.error('Please add at least one topic');
      return;
    }

    const subject = subjects.find(s => s.id === newSubject.subjectId);
    const subjectData = {
      ...newSubject,
      subjectName: subject?.name || ''
    };

    setFormData(prev => ({
      ...prev,
      subjectsStudied: [...prev.subjectsStudied, subjectData]
    }));

    setNewSubject({
      subjectId: '',
      topicsCovered: [],
      understandingLevel: 3,
      notes: ''
    });
  };

  const handleRemoveSubject = (index) => {
    setFormData(prev => ({
      ...prev,
      subjectsStudied: prev.subjectsStudied.filter((_, i) => i !== index)
    }));
  };

  const handleAddTopic = () => {
    const topic = prompt('Enter topic covered:');
    if (topic && topic.trim()) {
      setNewSubject(prev => ({
        ...prev,
        topicsCovered: [...prev.topicsCovered, topic.trim()]
      }));
    }
  };

  const handleRemoveTopic = (topicIndex) => {
    setNewSubject(prev => ({
      ...prev,
      topicsCovered: prev.topicsCovered.filter((_, i) => i !== topicIndex)
    }));
  };

  // Homework Management
  const [newHomework, setNewHomework] = useState({
    subjectId: '',
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const handleAddHomework = (type) => {
    if (!newHomework.subjectId || !newHomework.title) {
      toast.error('Please fill required fields for homework');
      return;
    }

    const homeworkData = {
      ...newHomework,
      completionStatus: type === 'assigned' ? 'NOT_DONE' : 'COMPLETE',
      quality: 3
    };

    if (type === 'assigned') {
      setFormData(prev => ({
        ...prev,
        homeworkAssigned: [...prev.homeworkAssigned, homeworkData]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        homeworkCompleted: [...prev.homeworkCompleted, homeworkData]
      }));
    }

    setNewHomework({
      subjectId: '',
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0]
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.studentId) newErrors.studentId = 'Student is required';
    if (!formData.classRoomId) newErrors.classRoomId = 'Classroom is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (formData.subjectsStudied.length === 0) {
      newErrors.subjectsStudied = 'At least one subject must be added';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const activityData = {
        ...formData,
        date: new Date(formData.date).toISOString()
      };

      if (isEditing && initialData?.id) {
        await updateActivity(initialData.id, activityData);
        toast.success('Activity updated successfully!');
      } else {
        await createActivity(activityData);
        toast.success('Activity recorded successfully!');
      }

      // Reset form if not editing
      if (!isEditing) {
        setFormData({
          studentId: '',
          classRoomId: '',
          subjectId: '',
          date: new Date().toISOString().split('T')[0],
          attendanceId: '',
          subjectsStudied: [],
          homeworkAssigned: [],
          homeworkCompleted: [],
          classworkCompleted: [],
          participationLevel: 3,
          assessmentsTaken: [],
          behaviorRating: 3,
          disciplineScore: 3,
          skillsSnapshot: {},
          strengths: '',
          improvements: '',
          concerns: '',
          teacherRemarks: '',
          parentNotes: ''
        });
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.message || 'Failed to save activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-yellow-600" />
          {isEditing ? 'Edit Daily Activity' : 'Record Daily Activity'}
        </h2>
        <p className="text-gray-600 mt-1">
          Record student's daily activities, progress, and observations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <div className="border-b border-gray-200 pb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-yellow-600" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ClassroomSelector
                value={teacherClasses?.find(c => c.id === formData.classRoomId)}
                onChange={(classroom) => handleChange('classRoomId', classroom?.id || '')}
                label="Classroom"
                required
                disabled={loading}
                className="w-full"
              />
              {errors.classRoomId && (
                <p className="mt-1 text-sm text-red-600">{errors.classRoomId}</p>
              )}
            </div>

            <div>
              <StudentSelector
                value={classroomStudents?.find(s => s.id === formData.studentId)}
                onChange={(student) => handleChange('studentId', student?.id || '')}
                label="Student"
                required
                disabled={loading || !formData.classRoomId}
                className="w-full"
                filterByClassroom={formData.classRoomId}
              />
              {errors.studentId && (
                <p className="mt-1 text-sm text-red-600">{errors.studentId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                disabled={loading}
                className={`
                  w-full px-3 py-2.5 border rounded-lg shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500
                  ${errors.date ? 'border-red-300' : 'border-gray-300'}
                  ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                `}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>

            <div>
              <SubjectSelector
                value={subjects?.find(s => s.id === formData.subjectId)}
                onChange={(subject) => handleChange('subjectId', subject?.id || '')}
                label="Primary Subject (Optional)"
                disabled={loading || !formData.classRoomId}
                className="w-full"
                subjects={subjects}
                filterByClassroom={formData.classRoomId}
              />
            </div>
          </div>
        </div>

        {/* Subjects Studied Section */}
        <div className="border-b border-gray-200 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-yellow-600" />
              Subjects Studied Today
            </h3>
            <span className="text-sm font-medium px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
              {formData.subjectsStudied.length} subject{formData.subjectsStudied.length !== 1 ? 's' : ''}
            </span>
          </div>

          {errors.subjectsStudied && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.subjectsStudied}</p>
            </div>
          )}

          {/* Add Subject Form */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Add New Subject</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <SubjectSelector
                value={subjects?.find(s => s.id === newSubject.subjectId)}
                onChange={(subject) => setNewSubject(prev => ({ ...prev, subjectId: subject?.id || '' }))}
                label="Subject"
                disabled={loading || !formData.classRoomId}
                className="w-full"
                subjects={subjects}
                filterByClassroom={formData.classRoomId}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Understanding Level
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setNewSubject(prev => ({ ...prev, understandingLevel: level }))}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${newSubject.understandingLevel === level 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                      `}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Topics */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topics Covered
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {newSubject.topicsCovered.map((topic, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(index)}
                      className="ml-1 hover:text-yellow-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddTopic}
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Topic
              </button>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={newSubject.notes}
                onChange={(e) => setNewSubject(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this subject..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                rows="2"
              />
            </div>

            <button
              type="button"
              onClick={handleAddSubject}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </button>
          </div>

          {/* Subjects List */}
          {formData.subjectsStudied.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Added Subjects</h4>
              {formData.subjectsStudied.map((subject, index) => {
                const subjectInfo = subjects.find(s => s.id === subject.subjectId);
                return (
                  <div 
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">
                          {subjectInfo?.name || `Subject ${index + 1}`}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {subject.topicsCovered.length} topic{subject.topicsCovered.length !== 1 ? 's' : ''}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            subject.understandingLevel >= 4 
                              ? 'bg-green-100 text-green-800'
                              : subject.understandingLevel >= 3
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            Level: {subject.understandingLevel}/5
                          </span>
                        </div>
                      </div>
                      {subject.topicsCovered.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {subject.topicsCovered.map((topic, topicIndex) => (
                            <span 
                              key={topicIndex}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      {subject.notes && (
                        <p className="mt-2 text-sm text-gray-600">{subject.notes}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(index)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance & Behavior Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <RatingInput
              value={formData.participationLevel}
              onChange={(value) => handleChange('participationLevel', value)}
              label="Participation Level"
              required
              disabled={loading}
              size="lg"
              showLabel
            />
          </div>
          
          <div>
            <RatingInput
              value={formData.behaviorRating}
              onChange={(value) => handleChange('behaviorRating', value)}
              label="Behavior Rating"
              required
              disabled={loading}
              size="lg"
              showLabel
            />
          </div>
          
          <div>
            <RatingInput
              value={formData.disciplineScore}
              onChange={(value) => handleChange('disciplineScore', value)}
              label="Discipline Score"
              required
              disabled={loading}
              size="lg"
              showLabel
            />
          </div>
        </div>

        {/* Feedback Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strengths <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              value={formData.strengths}
              onChange={(e) => handleChange('strengths', e.target.value)}
              placeholder="Note student's strengths today..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Areas for Improvement <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea
              value={formData.improvements}
              onChange={(e) => handleChange('improvements', e.target.value)}
              placeholder="Note areas where student can improve..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              rows="3"
            />
          </div>
        </div>

        {/* Teacher Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teacher Remarks <span className="text-gray-400">(Optional)</span>
          </label>
          <textarea
            value={formData.teacherRemarks}
            onChange={(e) => handleChange('teacherRemarks', e.target.value)}
            placeholder="Additional observations or notes..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            rows="4"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to discard changes?')) {
                onSuccess?.();
              }
            }}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            disabled={loading}
          >
            Cancel
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                // Save as draft functionality
                console.log('Save as draft:', formData);
                toast.success('Saved as draft');
              }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              Save Draft
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className={`
                px-6 py-2.5 text-sm font-medium text-white rounded-lg
                flex items-center
                ${loading 
                  ? 'bg-yellow-400 cursor-not-allowed' 
                  : 'bg-yellow-600 hover:bg-yellow-700'}
              `}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Activity' : 'Record Activity'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DailyActivityForm;