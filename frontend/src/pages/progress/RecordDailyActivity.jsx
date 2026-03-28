// FILE: src/pages/progress/RecordDailyActivity.jsx
// Optimized: memoized callbacks, stable handlers, mobile-first layout with bottom-sheet picker

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dailyActivityService from '../../services/dailyActivityService';
import api from '../../services/api';
import StudentClassPicker from '../../components/shared/StudentClassPicker';
import {
  BookOpen, Star, ChevronDown, ChevronUp,
  Plus, Trash2, CheckCircle, Loader, ArrowLeft,
  Users, Calendar, X, ChevronRight,
} from 'lucide-react';

/* ─── Rating buttons — memo prevents re-render when other state changes ── */
const RatingInput = memo(({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n} type="button" onClick={() => onChange(n)}
          // Min 44px touch target on mobile
          className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg text-sm font-semibold transition-colors ${
            value === n
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-500 active:bg-amber-100'
          }`}
        >{n}</button>
      ))}
    </div>
  </div>
));
RatingInput.displayName = 'RatingInput';

/* ─── Toggle — memo + bigger touch target ── */
const Toggle = memo(({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <button
      type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-emerald-500' : 'bg-gray-300'
      }`}
      role="switch" aria-checked={checked}
    >
      <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  </div>
));
Toggle.displayName = 'Toggle';

/* ─── Collapsible section ── */
const Section = memo(({ title, icon: Icon, color, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${color}`}><Icon size={16} className="text-white" /></div>
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
        </div>
        {open
          ? <ChevronUp size={16} className="text-gray-400" />
          : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
});
Section.displayName = 'Section';

/* ─── Topic row — isolated so typing one topic doesn't re-render others ── */
const TopicInput = memo(({ value, index, canRemove, onChange, onRemove }) => (
  <div className="flex gap-2 mb-2">
    <input
      type="text"
      placeholder={`Topic ${index + 1}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
    />
    {canRemove && (
      <button
        type="button" onClick={onRemove}
        className="p-2.5 hover:bg-red-50 active:bg-red-100 rounded-lg text-red-400 flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    )}
  </div>
));
TopicInput.displayName = 'TopicInput';

/* ══════════════════════════════════════════════════════════════ */
const RecordDailyActivity = () => {
  const navigate = useNavigate();

  // ── Student selection ──
  const [studentId, setStudentId]         = useState('');
  const [classRoomId, setClassRoomId]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ── Mobile bottom-sheet state ──
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Form fields ──
  const [date, setDate]                         = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState('PRESENT');
  const [totalHoursSpent, setTotalHoursSpent]   = useState(0);
  const [subjectsStudied, setSubjectsStudied]   = useState([
    { subjectId: '', topicsCovered: [''], understandingLevel: 3, notes: '' }
  ]);
  const [participationLevel, setParticipationLevel] = useState(3);
  const [behaviorRating, setBehaviorRating]         = useState(3);
  const [disciplineScore, setDisciplineScore]       = useState(3);
  const [punctuality, setPunctuality]               = useState(true);
  const [uniformCompliance, setUniformCompliance]   = useState(true);
  const [teacherRemarks, setTeacherRemarks]         = useState('');
  const [strengths, setStrengths]                   = useState('');
  const [improvements, setImprovements]             = useState('');
  const [concerns, setConcerns]                     = useState('');

  // ── Subjects list ──
  const [subjects, setSubjects]   = useState([]);
  const [submitting, setSubmitting] = useState(false);

  /* ── Load classroom subjects — cancel on classRoomId change ── */
  useEffect(() => {
    if (!classRoomId) { setSubjects([]); return; }
    let cancelled = false;
    api.get(`/classes/${classRoomId}/subjects`)
      .then(r => {
        if (!cancelled) setSubjects(r.data?.data || r.data?.subjects || []);
      })
      .catch(() => { if (!cancelled) setSubjects([]); });
    return () => { cancelled = true; };
  }, [classRoomId]);

  /* ── Stable picker handler — won't cause StudentClassPicker re-renders ── */
  const handlePick = useCallback(({ classRoomId: cid, studentId: sid, student }) => {
    setClassRoomId(cid || '');
    setStudentId(sid || '');
    setSelectedStudent(student || null);
    // Auto-close sheet on mobile once student is selected
    if (sid) setPickerOpen(false);
  }, []);

  /* ── Subject helpers — all stable, no recreations ── */
  const addSubject = useCallback(() =>
    setSubjectsStudied(p => [...p, { subjectId: '', topicsCovered: [''], understandingLevel: 3, notes: '' }]),
  []);

  const removeSubject = useCallback((i) =>
    setSubjectsStudied(p => p.filter((_, idx) => idx !== i)),
  []);

  const updateSubject = useCallback((i, k, v) =>
    setSubjectsStudied(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s)),
  []);

  const addTopic = useCallback((si) =>
    setSubjectsStudied(p => p.map((s, i) => i === si ? { ...s, topicsCovered: [...s.topicsCovered, ''] } : s)),
  []);

  const updateTopic = useCallback((si, ti, v) =>
    setSubjectsStudied(p =>
      p.map((s, i) => i === si
        ? { ...s, topicsCovered: s.topicsCovered.map((t, j) => j === ti ? v : t) }
        : s)),
  []);

  const removeTopic = useCallback((si, ti) =>
    setSubjectsStudied(p =>
      p.map((s, i) => i === si
        ? { ...s, topicsCovered: s.topicsCovered.filter((_, j) => j !== ti) }
        : s)),
  []);

  const resetForm = useCallback(() => {
  setStudentId('');
  setClassRoomId('');
  setSelectedStudent(null);
  setAttendanceStatus('PRESENT');
  setTotalHoursSpent(0);
  setSubjectsStudied([{ subjectId: '', topicsCovered: [''], understandingLevel: 3, notes: '' }]);
  setParticipationLevel(3);
  setBehaviorRating(3);
  setDisciplineScore(3);
  setPunctuality(true);
  setUniformCompliance(true);
  setTeacherRemarks('');
  setStrengths('');
  setImprovements('');
  setConcerns('');
}, []);

  /* ── Memoized today's date string for max attribute ── */
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  /* ── Observation fields config — memoized so it doesn't regenerate ── */
  const observationFields = useMemo(() => [
    { label: 'Strengths',              value: strengths,     setter: setStrengths,     placeholder: 'What the student excelled at today…',    maxLen: 500  },
    { label: 'Areas for Improvement',  value: improvements,  setter: setImprovements,  placeholder: 'What needs more practice…',               maxLen: 500  },
    { label: 'Concerns',               value: concerns,      setter: setConcerns,      placeholder: 'Any behavioral or academic concerns…',    maxLen: 500  },
    { label: 'Teacher Remarks',        value: teacherRemarks,setter: setTeacherRemarks,placeholder: 'Overall remarks for the day…',            maxLen: 1000 },
  ], [strengths, improvements, concerns, teacherRemarks]);

  /* ── Submit ── */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!studentId || !classRoomId) { toast.error('Select a student first'); return; }

    const filteredSubjects = subjectsStudied.filter(
      s => s.subjectId && s.topicsCovered.filter(t => t.trim()).length > 0
    );
    if (filteredSubjects.length === 0) {
      toast.error('At least one subject with topics is required');
      return;
    }

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
      resetForm(); 
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.response?.data?.message;
      if (status === 409)
        toast.error('Activity already recorded for this student today — update the existing record instead.', { duration: 5000 });
      else if (status === 403)
        toast.error(msg || 'Only REGULAR students are eligible for activity tracking');
      else if (status === 400)
        toast.error(msg || 'Validation error — check all required fields');
      else
        toast.error(msg || 'Connection error, please try again');
    } finally {
      setSubmitting(false);
    }
  }, [
    studentId, classRoomId, date, attendanceStatus, totalHoursSpent,
    subjectsStudied, participationLevel, behaviorRating, disciplineScore,
    punctuality, uniformCompliance, teacherRemarks, strengths, improvements,
    concerns,  resetForm,
  ]);

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (md+): side panel + scrollable form
      ════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex h-[calc(100vh-80px)] gap-0 overflow-hidden bg-gray-50">

        {/* Left panel */}
        <div className="w-64 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-hidden shadow-sm">
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
            <button
              type="button" 
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

        {/* Right form panel */}
        <div className="flex-1 overflow-y-auto">
          <FormContent
            selectedStudent={selectedStudent}
            studentId={studentId}
            date={date} setDate={setDate}
            todayStr={todayStr}
            attendanceStatus={attendanceStatus} setAttendanceStatus={setAttendanceStatus}
            totalHoursSpent={totalHoursSpent} setTotalHoursSpent={setTotalHoursSpent}
            subjects={subjects}
            classRoomId={classRoomId}
            subjectsStudied={subjectsStudied}
            addSubject={addSubject} removeSubject={removeSubject}
            updateSubject={updateSubject} addTopic={addTopic}
            updateTopic={updateTopic} removeTopic={removeTopic}
            participationLevel={participationLevel} setParticipationLevel={setParticipationLevel}
            behaviorRating={behaviorRating} setBehaviorRating={setBehaviorRating}
            disciplineScore={disciplineScore} setDisciplineScore={setDisciplineScore}
            punctuality={punctuality} setPunctuality={setPunctuality}
            uniformCompliance={uniformCompliance} setUniformCompliance={setUniformCompliance}
            observationFields={observationFields}
            submitting={submitting}
            handleSubmit={handleSubmit}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MOBILE LAYOUT  (<md): full-screen form + bottom sheet
      ════════════════════════════════════════════════════════ */}
      <div className="flex md:hidden flex-col h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            type="button" 
            className="p-2 -ml-2 rounded-xl text-gray-500 active:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Record Daily Activity</h1>
            <p className="text-xs text-gray-400">REGULAR students only</p>
          </div>
        </div>

        {/* Student selector button — tappable pill */}
        <div className="px-4 pt-3 pb-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors ${
              selectedStudent
                ? 'bg-amber-50 border-amber-200'
                : 'bg-white border-dashed border-gray-200 active:bg-gray-50'
            }`}
          >
            {selectedStudent ? (
              <>
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(selectedStudent.user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-amber-900 text-sm truncate">{selectedStudent.user?.name}</p>
                  <p className="text-xs text-amber-600">{selectedStudent.admissionNo} · {selectedStudent.studentType}</p>
                </div>
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">Selected</span>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-gray-400" />
                </div>
                <p className="flex-1 text-sm text-gray-400 text-left">Tap to select a student</p>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <FormContent
            selectedStudent={selectedStudent}
            studentId={studentId}
            date={date} setDate={setDate}
            todayStr={todayStr}
            attendanceStatus={attendanceStatus} setAttendanceStatus={setAttendanceStatus}
            totalHoursSpent={totalHoursSpent} setTotalHoursSpent={setTotalHoursSpent}
            subjects={subjects}
            classRoomId={classRoomId}
            subjectsStudied={subjectsStudied}
            addSubject={addSubject} removeSubject={removeSubject}
            updateSubject={updateSubject} addTopic={addTopic}
            updateTopic={updateTopic} removeTopic={removeTopic}
            participationLevel={participationLevel} setParticipationLevel={setParticipationLevel}
            behaviorRating={behaviorRating} setBehaviorRating={setBehaviorRating}
            disciplineScore={disciplineScore} setDisciplineScore={setDisciplineScore}
            punctuality={punctuality} setPunctuality={setPunctuality}
            uniformCompliance={uniformCompliance} setUniformCompliance={setUniformCompliance}
            observationFields={observationFields}
            submitting={submitting}
            handleSubmit={handleSubmit}
            hideBanner // banner already shown above on mobile
            hideTitle  // title shown in top bar
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MOBILE BOTTOM SHEET — Student / Class Picker
      ════════════════════════════════════════════════════════ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl flex flex-col max-h-[85vh] shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Select Student</h3>
                <p className="text-xs text-gray-400">Choose a class, then tap a student</p>
              </div>
              <button
                type="button" onClick={() => setPickerOpen(false)}
                className="p-2 rounded-xl text-gray-400 active:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Picker fills remaining height */}
            <div className="flex-1 overflow-hidden">
              <StudentClassPicker onSelect={handlePick} />
            </div>

            {/* Safe area bottom padding */}
            <div className="h-safe-bottom flex-shrink-0 pb-4" />
          </div>
        </div>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════════════════════
   FormContent — shared between desktop & mobile, memo'd
══════════════════════════════════════════════════════════════ */
const FormContent = memo(({
  selectedStudent, studentId,
  date, setDate, todayStr,
  attendanceStatus, setAttendanceStatus,
  totalHoursSpent, setTotalHoursSpent,
  subjects, classRoomId,
  subjectsStudied,
  addSubject, removeSubject, updateSubject, addTopic, updateTopic, removeTopic,
  participationLevel, setParticipationLevel,
  behaviorRating, setBehaviorRating,
  disciplineScore, setDisciplineScore,
  punctuality, setPunctuality,
  uniformCompliance, setUniformCompliance,
  observationFields,
  submitting, handleSubmit, onCancel,
  hideBanner = false,
  hideTitle = false,
}) => (
  <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 pb-32 sm:pb-10">

    {!hideTitle && (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record Daily Activity</h1>
        <p className="text-sm text-gray-500">For REGULAR students only</p>
      </div>
    )}

    {/* Desktop student banner */}
    {!hideBanner && (
      selectedStudent ? (
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
          <Users size={18} className="text-gray-300 flex-shrink-0" />
          <p className="text-sm text-gray-400">← Select a class and student from the left panel to begin</p>
        </div>
      )
    )}

    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Attendance & Date ── */}
      <Section title="Attendance & Date" icon={Calendar} color="bg-indigo-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date" value={date} max={todayStr}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-3 sm:py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Attendance</label>
            <select
              value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value)}
              className="w-full px-3 py-3 sm:py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
              value={totalHoursSpent} onChange={e => setTotalHoursSpent(e.target.value)}
              className="w-full px-3 py-3 sm:py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </Section>

      {/* ── Subjects Studied ── */}
      <Section title={`Subjects Studied (${subjectsStudied.length})`} icon={BookOpen} color="bg-emerald-500">
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
          At least one subject with topics is required.
        </p>

        {subjectsStudied.map((subj, si) => (
          <SubjectCard
            key={si}
            index={si}
            subj={subj}
            subjects={subjects}
            classRoomId={classRoomId}
            canRemove={subjectsStudied.length > 1}
            onRemove={removeSubject}
            onUpdate={updateSubject}
            onAddTopic={addTopic}
            onUpdateTopic={updateTopic}
            onRemoveTopic={removeTopic}
          />
        ))}

        <button
          type="button" onClick={addSubject}
          className="flex items-center gap-2 text-sm text-emerald-600 font-medium py-1"
        >
          <Plus size={16} /> Add another subject
        </button>
      </Section>

      {/* ── Behavioral Ratings ── */}
      <Section title="Behavioral Ratings" icon={Star} color="bg-amber-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <RatingInput label="Participation Level" value={participationLevel} onChange={setParticipationLevel} />
          <RatingInput label="Behavior Rating"     value={behaviorRating}     onChange={setBehaviorRating} />
          <RatingInput label="Discipline Score"    value={disciplineScore}    onChange={setDisciplineScore} />
        </div>
        <div className="border-t border-gray-100 pt-4 space-y-1">
          <Toggle label="Punctual"           checked={punctuality}       onChange={setPunctuality} />
          <Toggle label="Uniform Compliant"  checked={uniformCompliance} onChange={setUniformCompliance} />
        </div>
      </Section>

      {/* ── Teacher Observations ── */}
      <Section title="Teacher Observations" icon={CheckCircle} color="bg-purple-500" defaultOpen={false}>
        {observationFields.map(({ label, value, setter, placeholder, maxLen }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <textarea
              rows={3} placeholder={placeholder} value={value}
              onChange={e => setter(e.target.value)} maxLength={maxLen}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        ))}
      </Section>

      {/* ── Submit — sticky on mobile, inline on desktop ── */}
      <div className="
        fixed bottom-0 left-0 right-0 z-40
        sm:static sm:z-auto
        flex gap-3 px-4 py-3 sm:p-0 sm:pt-2 sm:pb-8
        bg-white sm:bg-transparent
        border-t border-gray-100 sm:border-0
        shadow-[0_-4px_24px_rgba(0,0,0,0.06)] sm:shadow-none
      ">
        <button
          type="button" onClick={onCancel}
          className="px-5 py-3 sm:py-2.5 border border-gray-200 rounded-xl text-sm font-medium active:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !studentId}
          className="flex-1 px-6 py-3 sm:py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 active:bg-indigo-700"
        >
          {submitting
            ? <><Loader size={16} className="animate-spin" /> Saving…</>
            : 'Record Activity'}
        </button>
      </div>

    </form>
  </div>
));
FormContent.displayName = 'FormContent';

/* ── SubjectCard — isolated so one card's state doesn't re-render siblings ── */
const SubjectCard = memo(({
  index, subj, subjects, classRoomId, canRemove,
  onRemove, onUpdate, onAddTopic, onUpdateTopic, onRemoveTopic,
}) => (
  <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/60">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-gray-400 tracking-wide">SUBJECT {index + 1}</span>
      {canRemove && (
        <button
          type="button" onClick={() => onRemove(index)}
          className="p-2 hover:bg-red-50 active:bg-red-100 rounded-lg text-red-400"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        Subject <span className="text-red-500">*</span>
      </label>
      <select
        value={subj.subjectId}
        onChange={e => onUpdate(index, 'subjectId', e.target.value)}
        disabled={subjects.length === 0}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        required
      >
        <option value="">
          {!classRoomId ? 'Select a class first…' : subjects.length === 0 ? 'No subjects found' : 'Select subject…'}
        </option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        Topics Covered <span className="text-red-500">*</span>
      </label>
      {subj.topicsCovered.map((topic, ti) => (
        <TopicInput
          key={ti}
          index={ti}
          value={topic}
          canRemove={subj.topicsCovered.length > 1}
          onChange={v => onUpdateTopic(index, ti, v)}
          onRemove={() => onRemoveTopic(index, ti)}
        />
      ))}
      <button
        type="button" onClick={() => onAddTopic(index)}
        className="text-xs text-indigo-600 flex items-center gap-1 mt-1 py-1"
      >
        <Plus size={12} /> Add topic
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <RatingInput
        label="Understanding Level (1–5)"
        value={subj.understandingLevel}
        onChange={v => onUpdate(index, 'understandingLevel', v)}
      />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes (optional)</label>
        <input
          type="text" placeholder="Brief note…" value={subj.notes} maxLength={500}
          onChange={e => onUpdate(index, 'notes', e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
    </div>
  </div>
));
SubjectCard.displayName = 'SubjectCard';

export default RecordDailyActivity;