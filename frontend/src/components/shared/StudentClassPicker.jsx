// FILE: src/components/shared/StudentClassPicker.jsx
// PURPOSE: Reusable Class → Student selector used by multiple progress pages.
// USAGE:
//   <StudentClassPicker onSelect={({ classRoomId, studentId, student, classroom }) => …} />
//
// BACKEND CALLS:
//   GET /api/teachers/my-classes          → teacher's enrolled classrooms
//   GET /api/students?classRoomId=:id     → students in that class
//
// For ADMIN / SUPER_ADMIN roles:
//   GET /api/classes                      → all classrooms
//   GET /api/students?classRoomId=:id     → students in that class

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { School, Users, Search, ChevronDown, Loader } from 'lucide-react';

const StudentClassPicker = ({ onSelect, compact = false }) => {
    const { user } = useAuth();
    const isTeacher = user?.role === 'TEACHER';

    const [classrooms, setClassrooms] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [search, setSearch] = useState('');

    /* ── Load classrooms on mount ── */
    useEffect(() => {
        const load = async () => {
            setLoadingClasses(true);
            try {
                const endpoint = isTeacher ? '/teachers/my-classes' : '/classes';
                const res = await api.get(endpoint);
                // Teacher: res.data.data is array of { classRoom: {...} }
                // Admin:   res.data.data is array of classroom objects
                const raw = res.data?.data || res.data?.classes || res.data || [];
                const normalized = isTeacher
                    ? raw.map(e => e.classRoom || e).filter(Boolean)
                    : raw;
                setClassrooms(normalized);
            } catch {
                setClassrooms([]);
            } finally {
                setLoadingClasses(false);
            }
        };
        load();
    }, [isTeacher]);

    /* ── Load students when class changes ── */
    const loadStudents = useCallback(async (classId) => {
        if (!classId) { setStudents([]); return; }
        setLoadingStudents(true);
        setSelectedStudentId('');
        try {
            const res = await api.get(`/classes/${classId}/students`, {
                params: { limit: 200 }
            });
            const raw = res.data?.data || res.data?.students || res.data || [];
            // Backend returns enrollment objects { student: {...}, rollNumber, ... }
            // Unwrap to get the actual student objects
            const list = Array.isArray(raw) ? raw : [];
            const unwrapped = list.map(e => e.student || e).filter(Boolean);
            setStudents(unwrapped);
        } catch {
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    }, []);

    const handleClassChange = (classId) => {
        setSelectedClassId(classId);
        setSearch('');
        loadStudents(classId);
        onSelect({ classRoomId: classId, studentId: null, student: null });
    };

    const handleStudentSelect = (student) => {
        const id = student.id;
        setSelectedStudentId(id);
        onSelect({
            classRoomId: selectedClassId,
            studentId: id,
            student,
            classroom: classrooms.find(c => c.id === selectedClassId) || null,
        });
    };

    /* ── Filtered students ── */
    const filtered = students.filter(s => {
        const name = s.user?.name || s.name || '';
        const admNo = s.admissionNo || '';
        const q = search.toLowerCase();
        return name.toLowerCase().includes(q) || admNo.toLowerCase().includes(q);
    });

    if (compact) {
        /* ── Compact: two dropdowns inline ── */
        return (
            <div className="flex flex-wrap items-center gap-3">
                {/* Class dropdown */}
                <div className="relative">
                    <select
                        value={selectedClassId}
                        onChange={e => handleClassChange(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none min-w-[160px]"
                    >
                        <option value="">Select Class</option>
                        {loadingClasses
                            ? <option disabled>Loading…</option>
                            : classrooms.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name || c.grade || c.id}
                                </option>
                            ))}
                    </select>
                    <School size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Student dropdown */}
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

    /* ── Full: class dropdown + student list panel ── */
    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col h-full">
            {/* Class selector header */}
            <div className="p-3 border-b border-gray-100 bg-gray-50">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <School size={11} className="inline mr-1" />Class
                </label>
                <div className="relative">
                    <select
                        value={selectedClassId}
                        onChange={e => handleClassChange(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                    >
                        <option value="">{loadingClasses ? 'Loading…' : '— Select class —'}</option>
                        {classrooms.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name || c.grade || c.id}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Student search */}
            {selectedClassId && (
                <div className="px-3 pt-2 pb-1">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Student list */}
            <div className="flex-1 overflow-y-auto">
                {!selectedClassId ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                        <School size={24} className="text-gray-300 mb-2" />
                        <p className="text-xs text-gray-400">Select a class to see students</p>
                    </div>
                ) : loadingStudents ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader size={20} className="animate-spin text-amber-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-center px-4">
                        <Users size={20} className="text-gray-300 mb-1" />
                        <p className="text-xs text-gray-400">No students found</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {filtered.map(s => {
                            const name = s.user?.name || s.name || '—';
                            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                            const isSelected = s.id === selectedStudentId;
                            return (
                                <li key={s.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleStudentSelect(s)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-amber-50 ${isSelected ? 'bg-amber-50 border-l-2 border-amber-500' : ''
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-amber-900' : 'text-gray-800'}`}>
                                                {name}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">{s.admissionNo}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="ml-auto w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Footer count */}
            {selectedClassId && !loadingStudents && (
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-400">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</p>
                </div>
            )}
        </div>
    );
};

export default StudentClassPicker;
