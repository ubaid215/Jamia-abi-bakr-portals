// FILE: src/components/shared/StudentClassPicker.jsx
// Optimized: memoized filtering, debounced search, stable callbacks, mobile-first

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { School, Users, Search, ChevronDown, Loader, X } from 'lucide-react';

/* ─── Debounce hook ─────────────────────────────────────────── */
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─── Single student row — memo so list doesn't re-render all rows ── */
const StudentRow = memo(({ student, isSelected, onSelect }) => {
  const name = student.user?.name || student.name || '—';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(student)}
        className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors active:bg-amber-100 ${
          isSelected
            ? 'bg-amber-50 border-l-2 border-amber-500'
            : 'hover:bg-amber-50 border-l-2 border-transparent'
        }`}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isSelected ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isSelected ? 'text-amber-900' : 'text-gray-800'}`}>
            {name}
          </p>
          <p className="text-xs text-gray-400 truncate">{student.admissionNo}</p>
        </div>
        {isSelected && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
      </button>
    </li>
  );
});
StudentRow.displayName = 'StudentRow';

/* ══════════════════════════════════════════════════════════════ */
const StudentClassPicker = ({ onSelect, compact = false }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';

  const [classrooms, setClassrooms]           = useState([]);
  const [students, setStudents]               = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loadingClasses, setLoadingClasses]   = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch]                   = useState('');

  // Debounce search so filtering doesn't thrash on every keystroke
  const debouncedSearch = useDebounce(search, 250);

  // Stable ref for onSelect to avoid triggering useCallback deps
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  /* ── Load classrooms once on mount ── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingClasses(true);
      try {
        const endpoint = isTeacher ? '/teachers/my-classes' : '/classes';
        const res = await api.get(endpoint);
        if (cancelled) return;
        const raw = res.data?.data || res.data?.classes || res.data || [];
        const normalized = isTeacher
          ? raw.map(e => e.classRoom || e).filter(Boolean)
          : raw;
        setClassrooms(normalized);
      } catch {
        if (!cancelled) setClassrooms([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isTeacher]);

  /* ── Load students when class changes — stable, no onSelect in deps ── */
  const loadStudents = useCallback(async (classId) => {
    if (!classId) { setStudents([]); return; }
    setLoadingStudents(true);
    setSelectedStudentId('');
    try {
      const res = await api.get(`/classes/${classId}/students`, { params: { limit: 200 } });
      const raw = res.data?.data || res.data?.students || res.data || [];
      const list = Array.isArray(raw) ? raw : [];
      setStudents(list.map(e => e.student || e).filter(Boolean));
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []); // stable — no deps that change

  /* ── Memoized filtered list — only recomputes when students or debounced search changes ── */
  const filtered = useMemo(() => {
    if (!debouncedSearch) return students;
    const q = debouncedSearch.toLowerCase();
    return students.filter(s => {
      const name = (s.user?.name || s.name || '').toLowerCase();
      const adm  = (s.admissionNo || '').toLowerCase();
      return name.includes(q) || adm.includes(q);
    });
  }, [students, debouncedSearch]);

  /* ── Stable handlers ── */
  const handleClassChange = useCallback((classId) => {
    setSelectedClassId(classId);
    setSearch('');
    loadStudents(classId);
    onSelectRef.current({ classRoomId: classId, studentId: null, student: null });
  }, [loadStudents]);

  const handleStudentSelect = useCallback((student) => {
    setSelectedStudentId(student.id);
    onSelectRef.current({
      classRoomId: selectedClassId,
      studentId: student.id,
      student,
      classroom: null, // set by parent if needed
    });
  }, [selectedClassId]);

  /* ══ COMPACT MODE ══════════════════════════════════════════════ */
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={selectedClassId}
            onChange={e => handleClassChange(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none min-w-[160px]"
          >
            <option value="">{loadingClasses ? 'Loading…' : 'Select Class'}</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name || c.grade || c.id}</option>
            ))}
          </select>
          <School size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={selectedStudentId}
            onChange={e => {
              const s = students.find(st => st.id === e.target.value);
              if (s) handleStudentSelect(s);
            }}
            disabled={!selectedClassId || loadingStudents}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{loadingStudents ? 'Loading…' : 'Select Student'}</option>
            {filtered.map(s => (
              <option key={s.id} value={s.id}>
                {s.user?.name || s.name} ({s.admissionNo})
              </option>
            ))}
          </select>
          <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
    );
  }

  /* ══ FULL MODE (used in desktop left panel + mobile bottom sheet) ═ */
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Class selector */}
      <div className="p-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
          <School size={11} className="inline mr-1" />Class
        </label>
        <div className="relative">
          <select
            value={selectedClassId}
            onChange={e => handleClassChange(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-400 outline-none bg-white"
          >
            <option value="">{loadingClasses ? 'Loading…' : '— Select class —'}</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name || c.grade || c.id}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Search */}
      {selectedClassId && (
        <div className="px-3 pt-2 pb-1 flex-shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Student list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {!selectedClassId ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <School size={28} className="text-gray-200 mb-2" />
            <p className="text-xs text-gray-400">Select a class to see students</p>
          </div>
        ) : loadingStudents ? (
          <div className="flex items-center justify-center h-32">
            <Loader size={22} className="animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Users size={22} className="text-gray-200 mb-1" />
            <p className="text-xs text-gray-400">No students found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map(s => (
              <StudentRow
                key={s.id}
                student={s}
                isSelected={s.id === selectedStudentId}
                onSelect={handleStudentSelect}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {selectedClassId && !loadingStudents && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-400">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default memo(StudentClassPicker);