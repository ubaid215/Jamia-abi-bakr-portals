// FILE: src/pages/progress/RecordDailyActivity.jsx
// BACKEND: POST /api/activities   (createActivitySchema)
// ONLY for REGULAR students. 409 = already recorded today.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dailyActivityService from '../../services/dailyActivityService';
import api from '../../services/api';
import StudentClassPicker from '../../components/shared/StudentClassPicker';
import {
  BookOpen, User, Star, ChevronDown, ChevronUp,
  Plus, Trash2, CheckCircle, Loader, ArrowLeft, Users, Calendar
} from 'lucide-react';

/* ─── Rating buttons ─── */
const RatingInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n} type="button" onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${value === n ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-amber-100'
            }`}
        >{n}</button>
      ))}
    </div>
  </div>
);

/* ─── Toggle switch ─── */
const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-gray-600">{label}</span>
    <button
      type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </div>
);

/* ─── Collapsible section ─── */
const Section = ({ title, icon: Icon, color, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color}`}><Icon size={16} className="text-white" /></div>
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="p-4 pt-0 space-y-4">{children}</div>}
    </div>
  );
};

/* ══════════════════════════════════════════════════════ */
const RecordDailyActivity = () => {
  const navigate = useNavigate();

  // ── Student selected from left panel ──
  const [studentId, setStudentId] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ── Form fields ──
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState('PRESENT');
  const [totalHoursSpent, setTotalHoursSpent] = useState(0);
  const [subjectsStudied, setSubjectsStudied] = useState([
    { subjectId: '', topicsCovered: [''], understandingLevel: 3, notes: '' }
  ]);
  const [participationLevel, setParticipationLevel] = useState(3);
  const [behaviorRating, setBehaviorRating] = useState(3);
  const [disciplineScore, setDisciplineScore] = useState(3);
  const [punctuality, setPunctuality] = useState(true);
  const [uniformCompliance, setUniformCompliance] = useState(true);
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [concerns, setConcerns] = useState('');

  // ── Subjects list for selected classroom ──
  const [subjects, setSubjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Load classroom subjects when class changes
  useEffect(() => {
    if (!classRoomId) { setSubjects([]); return; }
    api.get(`/classes/${classRoomId}/subjects`)
      .then(r => setSubjects(r.data?.data || r.data?.subjects || []))
      .catch(() => setSubjects([]));
  }, [classRoomId]);

  // ── Handler from StudentClassPicker ──
  const handlePick = ({ classRoomId: cid, studentId: sid, student }) => {
    setClassRoomId(cid || '');
    setStudentId(sid || '');
    setSelectedStudent(student || null);
  };

  // ── Subject helpers ──
  const addSubject = () => setSubjectsStudied(p => [...p, { subjectId: '', topicsCovered: [''], understandingLevel: 3, notes: '' }]);
  const removeSubject = (i) => setSubjectsStudied(p => p.filter((_, idx) => idx !== i));
  const updateSubject = (i, k, v) => setSubjectsStudied(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const addTopic = (si) => setSubjectsStudied(p => p.map((s, i) => i === si ? { ...s, topicsCovered: [...s.topicsCovered, ''] } : s));
  const updateTopic = (si, ti, v) => setSubjectsStudied(p => p.map((s, i) => i === si ? { ...s, topicsCovered: s.topicsCovered.map((t, j) => j === ti ? v : t) } : s));
  const removeTopic = (si, ti) => setSubjectsStudied(p => p.map((s, i) => i === si ? { ...s, topicsCovered: s.topicsCovered.filter((_, j) => j !== ti) } : s));

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !classRoomId) { toast.error('Select a student first'); return; }
    const filteredSubjects = subjectsStudied.filter(s => s.subjectId && s.topicsCovered.filter(t => t.trim()).length > 0);
    if (filteredSubjects.length === 0) { toast.error('At least one subject with topics is required'); return; }

    const payload = {
      studentId, classRoomId,
      date: new Date(date).toISOString(),
      attendanceStatus,
      totalHoursSpent: parseFloat(totalHoursSpent) || 0,
      subjectsStudied: filteredSubjects.map(s => ({
        subjectId: s.subjectId,
        topicsCovered: s.topicsCovered.filter(t => t.trim()),
        understandingLevel: s.understandingLevel,
        notes: s.notes || null,
      })),
      participationLevel, behaviorRating, disciplineScore,
      punctuality, uniformCompliance,
      teacherRemarks: teacherRemarks || null,
      strengths: strengths || null,
      improvements: improvements || null,
      concerns: concerns || null,
    };

    setSubmitting(true);
    try {
      await dailyActivityService.create(payload);
      toast.success('Daily activity recorded successfully!');
      navigate(-1);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.response?.data?.message;
      if (status === 409) toast.error('Activity already recorded for this student today — update the existing record instead.', { duration: 5000 });
      else if (status === 403) toast.error(msg || 'Only REGULAR students are eligible for activity tracking');
      else if (status === 400) toast.error(msg || 'Validation error — check all required fields');
      else toast.error(msg || 'Connection error, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 overflow-hidden bg-gray-50">

      {/* LEFT PANEL — Student selector */}
      <div className="w-64 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-hidden shadow-sm">
        <div className="px-3 pt-3 pb-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-2 transition-colors"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Users size={14} className="text-amber-500" /> Select Student
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Click a student to begin</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <StudentClassPicker onSelect={handlePick} />
        </div>
      </div>

      {/* RIGHT PANEL — Activity form */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">

          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Record Daily Activity</h1>
            <p className="text-sm text-gray-500">For REGULAR students only</p>
          </div>

          {/* Selected student banner / prompt */}
          {selectedStudent ? (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(selectedStudent.user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-900 truncate">{selectedStudent.user?.name}</p>
                <p className="text-xs text-amber-600">{selectedStudent.admissionNo} · {selectedStudent.studentType}</p>
              </div>
              <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">Selected</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-white border border-dashed border-gray-200 rounded-xl">
              <Users size={18} className="text-gray-300" />
              <p className="text-sm text-gray-400">← Select a class and student from the left panel to begin</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Attendance & Date ───────────────────────────────── */}
            <Section title="Attendance & Date" icon={Calendar} color="bg-indigo-500">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Attendance</label>
                  <select
                    value={attendanceStatus}
                    onChange={e => setAttendanceStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hours Spent</label>
                  <input
                    type="number" min="0" max="24" step="0.5"
                    value={totalHoursSpent}
                    onChange={e => setTotalHoursSpent(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </Section>

            {/* ── Subjects Studied ────────────────────────────────── */}
            <Section title={`Subjects Studied (${subjectsStudied.length})`} icon={BookOpen} color="bg-emerald-500">
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                At least one subject with topics is required.
              </p>

              {subjectsStudied.map((subj, si) => (
                <div key={si} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">SUBJECT {si + 1}</span>
                    {subjectsStudied.length > 1 && (
                      <button type="button" onClick={() => removeSubject(si)} className="p-1 hover:bg-red-50 rounded text-red-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={subj.subjectId}
                        onChange={e => updateSubject(si, 'subjectId', e.target.value)}
                        disabled={subjects.length === 0}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="">
                          {!classRoomId ? 'Select a class first…' : subjects.length === 0 ? 'No subjects found' : 'Select subject…'}
                        </option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Topics Covered <span className="text-red-500">*</span></label>
                    {subj.topicsCovered.map((topic, ti) => (
                      <div key={ti} className="flex gap-2 mb-1.5">
                        <input
                          type="text" placeholder={`Topic ${ti + 1}`} value={topic}
                          onChange={e => updateTopic(si, ti, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        {subj.topicsCovered.length > 1 && (
                          <button type="button" onClick={() => removeTopic(si, ti)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addTopic(si)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                      <Plus size={12} /> Add topic
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <RatingInput
                      label="Understanding Level (1–5)"
                      value={subj.understandingLevel}
                      onChange={v => updateSubject(si, 'understandingLevel', v)}
                    />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                      <input
                        type="text" placeholder="Brief note…" value={subj.notes}
                        onChange={e => updateSubject(si, 'notes', e.target.value)}
                        maxLength={500}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" onClick={addSubject} className="flex items-center gap-2 text-sm text-emerald-600 font-medium hover:underline">
                <Plus size={16} /> Add another subject
              </button>
            </Section>

            {/* ── Behavioral Ratings ──────────────────────────────── */}
            <Section title="Behavioral Ratings" icon={Star} color="bg-amber-500">
              <div className="grid sm:grid-cols-3 gap-4">
                <RatingInput label="Participation Level" value={participationLevel} onChange={setParticipationLevel} />
                <RatingInput label="Behavior Rating" value={behaviorRating} onChange={setBehaviorRating} />
                <RatingInput label="Discipline Score" value={disciplineScore} onChange={setDisciplineScore} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <Toggle label="Punctual" checked={punctuality} onChange={setPunctuality} />
                <Toggle label="Uniform Compliant" checked={uniformCompliance} onChange={setUniformCompliance} />
              </div>
            </Section>

            {/* ── Teacher Observations ────────────────────────────── */}
            <Section title="Teacher Observations" icon={CheckCircle} color="bg-purple-500" defaultOpen={false}>
              {[
                ['Strengths', strengths, setStrengths, 'What the student excelled at today…'],
                ['Areas for Improvement', improvements, setImprovements, 'What needs more practice…'],
                ['Concerns', concerns, setConcerns, 'Any behavioral or academic concerns…'],
                ['Teacher Remarks', teacherRemarks, setTeacherRemarks, 'Overall remarks for the day…'],
              ].map(([label, val, setter, placeholder]) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <textarea
                    rows={2} placeholder={placeholder} value={val}
                    onChange={e => setter(e.target.value)}
                    maxLength={label === 'Teacher Remarks' ? 1000 : 500}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ))}
            </Section>

            {/* ── Submit ──────────────────────────────────────────── */}
            <div className="flex gap-3 pt-2 pb-6">
              <button
                type="button" onClick={() => navigate(-1)}
                className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !studentId}
                className="flex-1 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader size={16} className="animate-spin" /> Saving…</> : 'Record Activity'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default RecordDailyActivity;