import { useState } from 'react';
import { useDailyActivity } from '../../contexts/DailyActivityContext';

export default function DailyActivityForm({ studentId, onSuccess }) {
  const { createDailyActivity, loading, error } = useDailyActivity();
  
  const [formData, setFormData] = useState({
    studentId: studentId || '',
    date: new Date().toISOString().split('T')[0],
    attendanceStatus: 'PRESENT',
    checkInTime: '',
    checkOutTime: '',
    subjectsStudied: [],
    homeworkAssigned: [],
    homeworkCompleted: [],
    assessmentsTaken: [],
    behaviorRating: 3,
    participationLevel: 3,
    disciplineScore: 3,
    punctuality: true,
    uniformCompliance: true,
    teacherRemarks: '',
    parentNotes: '',
  });

  const [currentSubject, setCurrentSubject] = useState({
    subjectId: '',
    subjectName: '',
    topicsCovered: [''],
    duration: 0,
    understandingLevel: 3,
    notes: '',
  });

  const [currentHomework, setCurrentHomework] = useState({
    subjectId: '',
    title: '',
    dueDate: '',
    description: '',
  });

  const [currentAssessment, setCurrentAssessment] = useState({
    subjectId: '',
    type: 'QUIZ',
    topic: '',
    marksObtained: 0,
    totalMarks: 100,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const addSubject = () => {
    if (!currentSubject.subjectName) return;
    
    setFormData(prev => ({
      ...prev,
      subjectsStudied: [...prev.subjectsStudied, {
        ...currentSubject,
        topicsCovered: currentSubject.topicsCovered.filter(t => t.trim()),
      }],
    }));
    
    setCurrentSubject({
      subjectId: '',
      subjectName: '',
      topicsCovered: [''],
      duration: 0,
      understandingLevel: 3,
      notes: '',
    });
  };

  const removeSubject = (index) => {
    setFormData(prev => ({
      ...prev,
      subjectsStudied: prev.subjectsStudied.filter((_, i) => i !== index),
    }));
  };

  const addHomework = () => {
    if (!currentHomework.title) return;
    
    setFormData(prev => ({
      ...prev,
      homeworkAssigned: [...prev.homeworkAssigned, currentHomework],
    }));
    
    setCurrentHomework({
      subjectId: '',
      title: '',
      dueDate: '',
      description: '',
    });
  };

  const addAssessment = () => {
    if (!currentAssessment.topic) return;
    
    setFormData(prev => ({
      ...prev,
      assessmentsTaken: [...prev.assessmentsTaken, currentAssessment],
    }));
    
    setCurrentAssessment({
      subjectId: '',
      type: 'QUIZ',
      topic: '',
      marksObtained: 0,
      totalMarks: 100,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await createDailyActivity(formData);
      if (onSuccess) onSuccess();
      
      setFormData({
        studentId: studentId || '',
        date: new Date().toISOString().split('T')[0],
        attendanceStatus: 'PRESENT',
        checkInTime: '',
        checkOutTime: '',
        subjectsStudied: [],
        homeworkAssigned: [],
        homeworkCompleted: [],
        assessmentsTaken: [],
        behaviorRating: 3,
        participationLevel: 3,
        disciplineScore: 3,
        punctuality: true,
        uniformCompliance: true,
        teacherRemarks: '',
        parentNotes: '',
      });
    } catch (err) {
      console.error('Failed to create daily activity:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-800">Daily Activity Record</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Status</label>
          <select
            name="attendanceStatus"
            value={formData.attendanceStatus}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="EXCUSED">Excused</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
          <input
            type="time"
            name="checkInTime"
            value={formData.checkInTime}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
          <input
            type="time"
            name="checkOutTime"
            value={formData.checkOutTime}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Subjects Studied</h3>
        
        {formData.subjectsStudied.map((subject, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded mb-2 flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{subject.subjectName}</p>
              <p className="text-sm text-gray-600">Duration: {subject.duration} mins | Level: {subject.understandingLevel}/5</p>
              <p className="text-sm text-gray-500">Topics: {subject.topicsCovered.join(', ')}</p>
            </div>
            <button
              type="button"
              onClick={() => removeSubject(index)}
              className="text-red-600 hover:text-red-800 text-sm ml-2"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="bg-blue-50 p-4 rounded mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Subject Name"
              value={currentSubject.subjectName}
              onChange={(e) => setCurrentSubject(prev => ({ ...prev, subjectName: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={currentSubject.duration}
              onChange={(e) => setCurrentSubject(prev => ({ ...prev, duration: Number(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Understanding Level (1-5)</label>
            <input
              type="range"
              min="1"
              max="5"
              value={currentSubject.understandingLevel}
              onChange={(e) => setCurrentSubject(prev => ({ ...prev, understandingLevel: Number(e.target.value) }))}
              className="w-full"
            />
            <span className="text-sm text-gray-600">{currentSubject.understandingLevel}/5</span>
          </div>

          <textarea
            placeholder="Topics covered (comma-separated)"
            value={currentSubject.topicsCovered[0]}
            onChange={(e) => setCurrentSubject(prev => ({ ...prev, topicsCovered: e.target.value.split(',') }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="2"
          />

          <button
            type="button"
            onClick={addSubject}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Subject
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Homework Assigned</h3>
        
        {formData.homeworkAssigned.map((hw, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded mb-2">
            <p className="font-medium">{hw.title}</p>
            <p className="text-sm text-gray-600">Due: {hw.dueDate}</p>
          </div>
        ))}

        <div className="bg-green-50 p-4 rounded mt-3 space-y-3">
          <input
            type="text"
            placeholder="Homework Title"
            value={currentHomework.title}
            onChange={(e) => setCurrentHomework(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="date"
            value={currentHomework.dueDate}
            onChange={(e) => setCurrentHomework(prev => ({ ...prev, dueDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <textarea
            placeholder="Description"
            value={currentHomework.description}
            onChange={(e) => setCurrentHomework(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="2"
          />
          <button
            type="button"
            onClick={addHomework}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Homework
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Assessments Taken</h3>
        
        {formData.assessmentsTaken.map((assessment, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded mb-2">
            <p className="font-medium">{assessment.type}: {assessment.topic}</p>
            <p className="text-sm text-gray-600">Score: {assessment.marksObtained}/{assessment.totalMarks}</p>
          </div>
        ))}

        <div className="bg-purple-50 p-4 rounded mt-3 space-y-3">
          <select
            value={currentAssessment.type}
            onChange={(e) => setCurrentAssessment(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="QUIZ">Quiz</option>
            <option value="TEST">Test</option>
            <option value="EXAM">Exam</option>
            <option value="ORAL">Oral</option>
          </select>
          
          <input
            type="text"
            placeholder="Topic"
            value={currentAssessment.topic}
            onChange={(e) => setCurrentAssessment(prev => ({ ...prev, topic: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Marks Obtained"
              value={currentAssessment.marksObtained}
              onChange={(e) => setCurrentAssessment(prev => ({ ...prev, marksObtained: Number(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              placeholder="Total Marks"
              value={currentAssessment.totalMarks}
              onChange={(e) => setCurrentAssessment(prev => ({ ...prev, totalMarks: Number(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <button
            type="button"
            onClick={addAssessment}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Add Assessment
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Behavior & Participation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Behavior Rating (1-5)</label>
            <input
              type="range"
              name="behaviorRating"
              min="1"
              max="5"
              value={formData.behaviorRating}
              onChange={handleInputChange}
              className="w-full"
            />
            <span className="text-sm text-gray-600">{formData.behaviorRating}/5</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Participation Level (1-5)</label>
            <input
              type="range"
              name="participationLevel"
              min="1"
              max="5"
              value={formData.participationLevel}
              onChange={handleInputChange}
              className="w-full"
            />
            <span className="text-sm text-gray-600">{formData.participationLevel}/5</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discipline Score (1-5)</label>
            <input
              type="range"
              name="disciplineScore"
              min="1"
              max="5"
              value={formData.disciplineScore}
              onChange={handleInputChange}
              className="w-full"
            />
            <span className="text-sm text-gray-600">{formData.disciplineScore}/5</span>
          </div>
        </div>

        <div className="flex gap-6 mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="punctuality"
              checked={formData.punctuality}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Punctual</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="uniformCompliance"
              checked={formData.uniformCompliance}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Uniform Compliance</span>
          </label>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Notes</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Remarks</label>
            <textarea
              name="teacherRemarks"
              value={formData.teacherRemarks}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Notes</label>
            <textarea
              name="parentNotes"
              value={formData.parentNotes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="3"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Daily Activity'}
        </button>
      </div>
    </form>
  );
}