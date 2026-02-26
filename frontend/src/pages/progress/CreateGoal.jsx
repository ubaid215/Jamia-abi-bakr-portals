// FILE: src/pages/progress/CreateGoal.jsx
// Create-goal form for Teachers / Admins.
// Uses StudentClassPicker to select the target student, then submits via goalService.create.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import goalService from '../../services/goalService';
import StudentClassPicker from '../../components/shared/StudentClassPicker';
import {
    Target, Plus, Trash2, ArrowLeft, Save, Users,
    BookOpen, Calendar, BarChart3, Eye, EyeOff
} from 'lucide-react';

const GOAL_TYPES = [
    'ACADEMIC', 'BEHAVIORAL', 'ATTENDANCE', 'HIFZ', 'NAZRA',
    'HOMEWORK', 'PARTICIPATION', 'DISCIPLINE', 'CUSTOM',
];

const CHECK_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'];

const CreateGoal = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [saving, setSaving] = useState(false);
    const [pickedStudent, setPickedStudent] = useState(null);

    const [form, setForm] = useState({
        goalType: 'ACADEMIC',
        title: '',
        description: '',
        metric: '',
        targetValue: '',
        currentValue: '0',
        unit: '',
        startDate: new Date().toISOString().slice(0, 10),
        targetDate: '',
        checkFrequency: 'WEEKLY',
        visibleToStudent: true,
        visibleToParent: true,
    });

    const [milestones, setMilestones] = useState([]);

    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const addMilestone = () => setMilestones(m => [...m, { title: '', targetValue: '' }]);
    const removeMilestone = (i) => setMilestones(m => m.filter((_, idx) => idx !== i));
    const updateMilestone = (i, key, value) =>
        setMilestones(m => m.map((ms, idx) => (idx === i ? { ...ms, [key]: value } : ms)));

    const handleStudentPick = ({ studentId, studentName }) => {
        setPickedStudent({ id: studentId, name: studentName });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pickedStudent?.id) return toast.error('Please select a student first');
        if (!form.title.trim()) return toast.error('Title is required');
        if (!form.metric.trim()) return toast.error('Metric is required');
        if (!form.unit.trim()) return toast.error('Unit is required');
        if (!form.targetValue || Number(form.targetValue) <= 0) return toast.error('Target value must be positive');
        if (!form.targetDate) return toast.error('Target date is required');

        setSaving(true);
        try {
            const payload = {
                studentId: pickedStudent.id,
                goalType: form.goalType,
                title: form.title.trim(),
                description: form.description.trim() || null,
                metric: form.metric.trim(),
                targetValue: Number(form.targetValue),
                currentValue: Number(form.currentValue) || 0,
                unit: form.unit.trim(),
                startDate: new Date(form.startDate).toISOString(),
                targetDate: new Date(form.targetDate).toISOString(),
                checkFrequency: form.checkFrequency,
                visibleToStudent: form.visibleToStudent,
                visibleToParent: form.visibleToParent,
                milestones: milestones
                    .filter(ms => ms.title.trim())
                    .map(ms => ({ title: ms.title.trim(), targetValue: Number(ms.targetValue) || 0 })),
            };

            await goalService.create(payload);
            toast.success('Goal created successfully!');
            // Navigate back to goals list
            const basePath = user?.role === 'TEACHER' ? '/teacher/progress/goals' : '/admin/progress-module/goals';
            navigate(basePath);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create goal';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const basePath = user?.role === 'TEACHER' ? '/teacher/progress/goals' : '/admin/progress-module/goals';

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(basePath)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Goal</h1>
                    <p className="text-sm text-gray-500">Set a measurable target for a student</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Student Picker */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={16} className="text-amber-500" />
                        <h3 className="font-semibold text-gray-800 text-sm">Select Student *</h3>
                    </div>
                    <StudentClassPicker compact onSelect={handleStudentPick} />
                    {pickedStudent && (
                        <div className="mt-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm rounded-lg inline-flex items-center gap-1.5">
                            <Target size={14} /> {pickedStudent.name}
                        </div>
                    )}
                </div>

                {/* Goal Info */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={16} className="text-indigo-500" />
                        <h3 className="font-semibold text-gray-800 text-sm">Goal Details</h3>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Goal Type *</label>
                            <select
                                value={form.goalType}
                                onChange={e => set('goalType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {GOAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Check Frequency</label>
                            <select
                                value={form.checkFrequency}
                                onChange={e => set('checkFrequency', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {CHECK_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="e.g. Complete 50 math exercises"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            maxLength={200}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Optional details about this goal..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            maxLength={500}
                        />
                    </div>
                </div>

                {/* Measurement */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart3 size={16} className="text-emerald-500" />
                        <h3 className="font-semibold text-gray-800 text-sm">Measurement</h3>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Metric *</label>
                            <input
                                type="text"
                                value={form.metric}
                                onChange={e => set('metric', e.target.value)}
                                placeholder="e.g. Exercises completed"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
                            <input
                                type="text"
                                value={form.unit}
                                onChange={e => set('unit', e.target.value)}
                                placeholder="e.g. exercises, pages, hours"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Current Value</label>
                            <input
                                type="number"
                                min="0"
                                value={form.currentValue}
                                onChange={e => set('currentValue', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Target Value *</label>
                            <input
                                type="number"
                                min="1"
                                value={form.targetValue}
                                onChange={e => set('targetValue', e.target.value)}
                                placeholder="50"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Dates */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar size={16} className="text-purple-500" />
                        <h3 className="font-semibold text-gray-800 text-sm">Timeline</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => set('startDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Target Date *</label>
                            <input
                                type="date"
                                value={form.targetDate}
                                onChange={e => set('targetDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Milestones */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target size={16} className="text-amber-500" />
                            <h3 className="font-semibold text-gray-800 text-sm">Milestones</h3>
                            <span className="text-xs text-gray-400">(optional)</span>
                        </div>
                        <button
                            type="button"
                            onClick={addMilestone}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>

                    {milestones.length === 0 && (
                        <p className="text-xs text-gray-400 py-2">No milestones added. Click "Add" to set intermediate targets.</p>
                    )}

                    {milestones.map((ms, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <input
                                type="text"
                                value={ms.title}
                                onChange={e => updateMilestone(i, 'title', e.target.value)}
                                placeholder="Milestone title"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <input
                                type="number"
                                min="0"
                                value={ms.targetValue}
                                onChange={e => updateMilestone(i, 'targetValue', e.target.value)}
                                placeholder="Value"
                                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button type="button" onClick={() => removeMilestone(i)} className="p-1.5 text-red-400 hover:text-red-600">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Visibility */}
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 text-sm mb-3">Visibility</h3>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.visibleToStudent}
                                onChange={e => set('visibleToStudent', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 flex items-center gap-1">
                                {form.visibleToStudent ? <Eye size={14} /> : <EyeOff size={14} />} Student
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.visibleToParent}
                                onChange={e => set('visibleToParent', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 flex items-center gap-1">
                                {form.visibleToParent ? <Eye size={14} /> : <EyeOff size={14} />} Parent
                            </span>
                        </label>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => navigate(basePath)}
                        className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        <Save size={16} /> {saving ? 'Creating...' : 'Create Goal'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateGoal;
