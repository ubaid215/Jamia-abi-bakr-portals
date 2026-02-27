import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import dailyActivityService from '../../services/dailyActivityService';
import snapshotService from '../../services/snapshotService';
import api from '../../services/api';
import {
  Users, Activity, Calendar, TrendingUp, AlertTriangle,
  CheckCircle, Clock, BarChart3, Loader, RefreshCw
} from 'lucide-react';

/* ── Attendance badge ── */
const Badge = ({ text, color }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{text}</span>
);

/* ── Student activity summary card ── */
const StudentCard = ({ student, activities }) => {
  const total = activities.length;
  const present = activities.filter(a => a.attendanceStatus === 'PRESENT').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  const latest = activities[0];
  const avgBehavior = total > 0
    ? (activities.reduce((sum, a) => sum + (a.behaviorRating || 0), 0) / total).toFixed(1)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{student.name || student.admissionNo}</p>
          <p className="text-xs text-gray-400">{student.admissionNo}</p>
        </div>
        {latest && (
          <Badge
            text={latest.attendanceStatus?.replace('_', ' ') || 'No record'}
            color={
              latest.attendanceStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                latest.attendanceStatus === 'ABSENT' ? 'bg-red-100 text-red-700' :
                  latest.attendanceStatus === 'LATE' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
            }
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-base font-bold text-indigo-600">{total}</p>
          <p className="text-xs text-gray-400">Records</p>
        </div>
        <div className="text-center p-2 bg-emerald-50 rounded-lg">
          <p className="text-base font-bold text-emerald-600">{rate}%</p>
          <p className="text-xs text-gray-400">Attendance</p>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <p className="text-base font-bold text-amber-600">{avgBehavior}</p>
          <p className="text-xs text-gray-400">Avg Behavior</p>
        </div>
      </div>

      {latest && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={11} />
          Last: {new Date(latest.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════ */
const ClassActivityOverview = () => {
  const { user } = useAuth();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activities, setActivities] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Load teacher's classes
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/teachers/my-classes');
        const data = res.data?.data || res.data?.classes || [];
        const arr = Array.isArray(data) ? data : [];
        setClasses(arr);
        if (arr.length > 0) setSelectedClass(arr[0]);
      } catch { /* silently degrade */ }
      finally { setLoadingClasses(false); }
    };
    load();
  }, []);

  // Load activities + at-risk when class changes
  const loadData = useCallback(async () => {
    if (!selectedClass?.id) return;
    setLoading(true);
    try {
      const [actRes, riskRes] = await Promise.allSettled([
        dailyActivityService.getByClass(selectedClass.id, { limit: 100 }),
        snapshotService.getAtRisk({ classRoomId: selectedClass.id }),
      ]);
      if (actRes.status === 'fulfilled') setActivities(actRes.value.data || []);
      if (riskRes.status === 'fulfilled') setAtRisk(riskRes.value.data || []);
    } catch (err) {
      toast.error('Failed to load class data');
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => { loadData(); }, [loadData]);

  // Group activities by student
  const studentMap = useMemo(() => {
    const map = {};
    activities.forEach(act => {
      const sid = act.studentId;
      if (!map[sid]) {
        map[sid] = {
          name: act.student?.user?.name,
          admissionNo: act.student?.admissionNo,
          activities: [],
        };
      }
      map[sid].activities.push(act);
    });
    // Sort by most recent activity
    Object.values(map).forEach(v => v.activities.sort((a, b) => new Date(b.date) - new Date(a.date)));
    return map;
  }, [activities]);

  const studentList = Object.entries(studentMap);
  const atRiskIds = new Set(atRisk.map(s => s.studentId));
  const totalPresent = activities.filter(a => a.attendanceStatus === 'PRESENT').length;
  const attendanceRate = activities.length > 0 ? Math.round((totalPresent / activities.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Activity Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">All REGULAR student activity records</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Class selector */}
          {loadingClasses ? (
            <div className="h-9 w-40 bg-gray-100 rounded-lg animate-pulse" />
          ) : classes.length > 0 ? (
            <select
              value={selectedClass?.id || ''}
              onChange={e => setSelectedClass(classes.find(c => c.id === e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name || `${c.grade}-${c.section}`}</option>
              ))}
            </select>
          ) : null}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Students Tracked', value: studentList.length, icon: Users, color: 'bg-indigo-500' },
            { label: 'Total Records', value: activities.length, icon: Activity, color: 'bg-emerald-500' },
            { label: 'Avg Attendance', value: `${attendanceRate}%`, icon: BarChart3, color: 'bg-amber-500' },
            { label: 'At-Risk Students', value: atRisk.length, icon: AlertTriangle, color: 'bg-red-500' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.color}`}>
                <item.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* At-risk alert */}
      {!loading && atRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">
              {atRisk.length} student{atRisk.length > 1 ? 's' : ''} at risk
            </p>
            <p className="text-xs text-red-600 mt-1">
              {atRisk.map(s => s.student?.user?.name || s.student?.admissionNo).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Student Cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : studentList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Activity size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No activity records yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {selectedClass ? 'No records found for this classroom' : 'Select a classroom to view activities'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {studentList.map(([sid, data]) => (
            <div key={sid} className="relative">
              {atRiskIds.has(sid) && (
                <div className="absolute -top-1.5 -right-1.5 z-10 p-1 bg-red-500 rounded-full">
                  <AlertTriangle size={10} className="text-white" />
                </div>
              )}
              <StudentCard student={data} activities={data.activities} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassActivityOverview;