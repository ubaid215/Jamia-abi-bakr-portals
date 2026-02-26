import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useStudent } from "../../contexts/StudentContext";
import dailyActivityService from "../../services/dailyActivityService";
import weeklyProgressService from "../../services/weeklyProgressService";
import {
  TrendingUp, BookOpen, Target, Award, Calendar, Clock,
  CheckCircle, BarChart3, ChevronDown, ChevronUp,
  Activity, FileText, Star, AlertTriangle
} from "lucide-react";

/* ─── Tab Button ─── */
const Tab = ({ active, label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
      }`}
  >
    <Icon size={16} /> {label}
  </button>
);

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, color = 'text-indigo-600', sub }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
    <Icon size={18} className={`mx-auto mb-1.5 ${color}`} />
    <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
    <p className="text-xs text-gray-500">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

/* ═══ Main Component ═══ */
const StudentProgress = () => {
  const { user } = useAuth();
  const { progress, loading: ctxLoading, fetchMyProgress } = useStudent();
  const studentId = user?.studentProfile?.id;

  const [tab, setTab] = useState('daily');
  const [activities, setActivities] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Fetch academic progress on mount
  useEffect(() => { fetchMyProgress(); }, [fetchMyProgress]);

  // Fetch daily activities
  useEffect(() => {
    if (!studentId || tab !== 'daily') return;
    setLoadingAct(true);
    dailyActivityService.getByStudent(studentId, { limit: 30 })
      .then(res => setActivities(res.data || []))
      .catch(() => setActivities([]))
      .finally(() => setLoadingAct(false));
  }, [studentId, tab]);

  // Fetch weekly progress
  useEffect(() => {
    if (!studentId || tab !== 'weekly') return;
    setLoadingWeek(true);
    weeklyProgressService.getByStudent(studentId, { limit: 20 })
      .then(res => setWeeklyReports(res.data || []))
      .catch(() => setWeeklyReports([]))
      .finally(() => setLoadingWeek(false));
  }, [studentId, tab]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';

  const toggle = (id) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Progress</h1>
          <p className="text-sm text-gray-500 mt-1">Daily activities, weekly reports & academic progress</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl border border-gray-100 p-2 overflow-x-auto">
          <Tab active={tab === 'daily'} label="Daily Activities" icon={Activity} onClick={() => setTab('daily')} />
          <Tab active={tab === 'weekly'} label="Weekly Reports" icon={BarChart3} onClick={() => setTab('weekly')} />
          <Tab active={tab === 'academic'} label="Academic Progress" icon={Award} onClick={() => setTab('academic')} />
        </div>

        {/* ═══ DAILY ACTIVITIES TAB ═══ */}
        {tab === 'daily' && (
          loadingAct ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" /></div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Activity size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No daily activities yet</h3>
              <p className="text-sm text-gray-400 mt-1">Your teacher will record daily activities here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* Row header */}
                  <button onClick={() => toggle(act.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${act.attendanceStatus === 'PRESENT' ? 'bg-emerald-500' : act.attendanceStatus === 'ABSENT' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{formatDate(act.date)}</p>
                        <p className="text-xs text-gray-500">{act.attendanceStatus} • {act.subjectsStudied?.length || 0} subjects • {act.totalHoursSpent || 0}h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {act.behaviorRating >= 4 && <Star size={14} className="text-amber-400 fill-amber-400" />}
                        {act.participationLevel === 'HIGH' && <TrendingUp size={14} className="text-emerald-500" />}
                      </div>
                      {expandedId === act.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {expandedId === act.id && (
                    <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
                      {/* Quick metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                        <div className="text-center p-2 bg-indigo-50 rounded-lg">
                          <p className="text-lg font-bold text-indigo-700">{act.behaviorRating || 0}/5</p>
                          <p className="text-xs text-indigo-500">Behavior</p>
                        </div>
                        <div className="text-center p-2 bg-emerald-50 rounded-lg">
                          <p className="text-lg font-bold text-emerald-700">{act.disciplineScore || 0}/5</p>
                          <p className="text-xs text-emerald-500">Discipline</p>
                        </div>
                        <div className="text-center p-2 bg-amber-50 rounded-lg">
                          <p className="text-lg font-bold text-amber-700">{act.participationLevel || '—'}</p>
                          <p className="text-xs text-amber-500">Participation</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded-lg">
                          <p className="text-lg font-bold text-purple-700">{act.totalHoursSpent || 0}h</p>
                          <p className="text-xs text-purple-500">Hours</p>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {act.punctuality && <span className={`text-xs px-2 py-0.5 rounded-full ${act.punctuality ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{act.punctuality ? '✓ Punctual' : '✗ Late'}</span>}
                        {act.uniformCompliance !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${act.uniformCompliance ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{act.uniformCompliance ? '✓ Uniform' : '✗ No Uniform'}</span>}
                        {act.homeworkCompleted !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${act.homeworkCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{act.homeworkCompleted ? '✓ HW Done' : '✗ HW Missing'}</span>}
                      </div>

                      {/* Subjects */}
                      {act.subjectsStudied?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1.5">Subjects Studied</p>
                          <div className="flex flex-wrap gap-2">
                            {act.subjectsStudied.map((s, i) => (
                              <div key={i} className="bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                                <span className="font-medium text-gray-800">{s.subjectName || s.subject?.name || 'Subject'}</span>
                                {s.topicsCovered?.length > 0 && (
                                  <span className="text-gray-500 ml-1">({s.topicsCovered.join(', ')})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Teacher remarks */}
                      {(act.strengths || act.improvements || act.teacherRemarks) && (
                        <div className="space-y-2">
                          {act.strengths && (
                            <div className="p-2 bg-emerald-50 rounded-lg">
                              <p className="text-xs font-medium text-emerald-700 mb-0.5">Strengths</p>
                              <p className="text-xs text-emerald-600">{act.strengths}</p>
                            </div>
                          )}
                          {act.improvements && (
                            <div className="p-2 bg-amber-50 rounded-lg">
                              <p className="text-xs font-medium text-amber-700 mb-0.5">Areas to Improve</p>
                              <p className="text-xs text-amber-600">{act.improvements}</p>
                            </div>
                          )}
                          {act.teacherRemarks && (
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <p className="text-xs font-medium text-blue-700 mb-0.5">Teacher Remarks</p>
                              <p className="text-xs text-blue-600">{act.teacherRemarks}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recorded by */}
                      {act.teacher && (
                        <p className="text-xs text-gray-400">Recorded by {act.teacher?.user?.name || 'Teacher'}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ═══ WEEKLY REPORTS TAB ═══ */}
        {tab === 'weekly' && (
          loadingWeek ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" /></div>
          ) : weeklyReports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No weekly reports yet</h3>
              <p className="text-sm text-gray-400 mt-1">Weekly summaries will appear once your teacher generates them</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weeklyReports.map(wr => (
                <div key={wr.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button onClick={() => toggle(wr.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Week {wr.weekNumber} • {wr.year}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(wr.weekStartDate)} — {formatDate(wr.weekEndDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {wr.overallScore !== undefined && (
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${wr.overallScore >= 80 ? 'bg-emerald-50 text-emerald-700' : wr.overallScore >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                          {Math.round(wr.overallScore)}%
                        </span>
                      )}
                      {expandedId === wr.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {expandedId === wr.id && (
                    <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
                      {/* Metrics grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                        {wr.attendanceRate !== undefined && (
                          <div className="text-center p-2 bg-blue-50 rounded-lg">
                            <p className="text-lg font-bold text-blue-700">{Math.round(wr.attendanceRate)}%</p>
                            <p className="text-xs text-blue-500">Attendance</p>
                          </div>
                        )}
                        {wr.averageBehavior !== undefined && (
                          <div className="text-center p-2 bg-indigo-50 rounded-lg">
                            <p className="text-lg font-bold text-indigo-700">{(wr.averageBehavior || 0).toFixed(1)}/5</p>
                            <p className="text-xs text-indigo-500">Behavior</p>
                          </div>
                        )}
                        {wr.averageDiscipline !== undefined && (
                          <div className="text-center p-2 bg-emerald-50 rounded-lg">
                            <p className="text-lg font-bold text-emerald-700">{(wr.averageDiscipline || 0).toFixed(1)}/5</p>
                            <p className="text-xs text-emerald-500">Discipline</p>
                          </div>
                        )}
                        {wr.totalHoursSpent !== undefined && (
                          <div className="text-center p-2 bg-purple-50 rounded-lg">
                            <p className="text-lg font-bold text-purple-700">{wr.totalHoursSpent || 0}h</p>
                            <p className="text-xs text-purple-500">Total Hours</p>
                          </div>
                        )}
                      </div>

                      {/* Activity count & homework */}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                        {wr.activitiesCount !== undefined && <span>📅 {wr.activitiesCount} activities</span>}
                        {wr.homeworkCompletionRate !== undefined && <span>📝 {Math.round(wr.homeworkCompletionRate)}% homework done</span>}
                        {wr.punctualityRate !== undefined && <span>⏰ {Math.round(wr.punctualityRate)}% on time</span>}
                      </div>

                      {/* Commentary */}
                      {wr.weeklyHighlights && (
                        <div className="p-2.5 bg-emerald-50 rounded-lg">
                          <p className="text-xs font-medium text-emerald-700 mb-0.5">Weekly Highlights</p>
                          <p className="text-xs text-emerald-600">{wr.weeklyHighlights}</p>
                        </div>
                      )}
                      {wr.areasOfImprovement && (
                        <div className="p-2.5 bg-amber-50 rounded-lg">
                          <p className="text-xs font-medium text-amber-700 mb-0.5">Areas for Improvement</p>
                          <p className="text-xs text-amber-600">{wr.areasOfImprovement}</p>
                        </div>
                      )}
                      {wr.teacherComments && (
                        <div className="p-2.5 bg-blue-50 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-0.5">Teacher Comments</p>
                          <p className="text-xs text-blue-600">{wr.teacherComments}</p>
                        </div>
                      )}
                      {wr.achievements && (
                        <div className="p-2.5 bg-purple-50 rounded-lg">
                          <p className="text-xs font-medium text-purple-700 mb-0.5">Achievements</p>
                          <p className="text-xs text-purple-600">{wr.achievements}</p>
                        </div>
                      )}
                      {wr.followUpRequired && (
                        <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                          <AlertTriangle size={12} /> Follow-up required
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* ═══ ACADEMIC PROGRESS TAB ═══ */}
        {tab === 'academic' && (
          ctxLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" /></div>
          ) : !progress ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Award size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No academic progress data</h3>
              <p className="text-sm text-gray-400 mt-1">Progress records will appear as your teacher records them</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Program type badge */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{progress.progressType} Program</p>
                    <p className="text-xs text-gray-500">
                      {progress.student?.name} • {progress.student?.admissionNo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Completion stats */}
              {progress.completionStats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {progress.progressType === 'HIFZ' && (
                    <>
                      <StatCard icon={BookOpen} label="Lines Memorized" value={progress.completionStats.totalLinesCompleted} color="text-purple-600" />
                      <StatCard icon={Target} label="Paras Done" value={progress.completionStats.parasCompleted} color="text-indigo-600" />
                      <StatCard icon={BarChart3} label="Completion" value={`${Math.round(progress.completionStats.completionPercentage || 0)}%`} color="text-emerald-600" />
                      <StatCard icon={TrendingUp} label="Daily Avg" value={progress.completionStats.averageDailyLines} color="text-blue-600" sub="lines/day" />
                      <StatCard icon={Clock} label="Est. Days Left" value={progress.completionStats.estimatedDaysRemaining ?? '—'} color="text-amber-600" />
                    </>
                  )}
                  {progress.progressType === 'NAZRA' && (
                    <>
                      <StatCard icon={BookOpen} label="Lines Recited" value={progress.completionStats.totalLinesRecited} color="text-purple-600" />
                      <StatCard icon={BarChart3} label="Completion" value={`${Math.round(progress.completionStats.completionPercentage || 0)}%`} color="text-emerald-600" />
                      <StatCard icon={TrendingUp} label="Daily Avg" value={progress.completionStats.averageDailyLines} color="text-blue-600" sub="lines/day" />
                      <StatCard icon={Clock} label="Est. Days Left" value={progress.completionStats.estimatedDaysRemaining ?? '—'} color="text-amber-600" />
                      <StatCard icon={CheckCircle} label="Status" value={progress.completionStats.isCompleted ? 'Done!' : 'Ongoing'} color={progress.completionStats.isCompleted ? 'text-emerald-600' : 'text-blue-600'} />
                    </>
                  )}
                  {progress.progressType === 'REGULAR' && (
                    <StatCard icon={BarChart3} label="Average %" value={`${progress.completionStats.averagePercentage || 0}%`} color="text-indigo-600" />
                  )}
                </div>
              )}

              {/* Progress records */}
              {progress.progress?.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Recent Records ({progress.pagination?.total || progress.progress.length})</h3>
                  {progress.progress.map((rec, i) => (
                    <div key={rec.id || i} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">{formatDate(rec.date)}</p>
                        {rec.teacher?.user?.name && <p className="text-xs text-gray-400">{rec.teacher.user.name}</p>}
                      </div>
                      {progress.progressType === 'HIFZ' && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 bg-purple-50 rounded text-center"><p className="font-bold text-purple-700">{rec.sabaqLines || 0}</p><p className="text-purple-500">Sabaq</p></div>
                          <div className="p-2 bg-indigo-50 rounded text-center"><p className="font-bold text-indigo-700">{rec.sabaqiLines || 0}</p><p className="text-indigo-500">Sabaqi</p></div>
                          <div className="p-2 bg-amber-50 rounded text-center"><p className="font-bold text-amber-700">{rec.manzilLines || 0}</p><p className="text-amber-500">Manzil</p></div>
                        </div>
                      )}
                      {progress.progressType === 'NAZRA' && (
                        <div className="text-xs">
                          <span className="font-medium text-gray-700">Lines recited: </span>
                          <span className="font-bold text-purple-700">{rec.recitedLines || 0}</span>
                        </div>
                      )}
                      {progress.progressType === 'REGULAR' && (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-medium text-gray-700">{rec.subject?.name || 'Subject'}</span>
                          <span className={`font-bold px-2 py-0.5 rounded ${rec.percentage >= 80 ? 'bg-emerald-50 text-emerald-700' : rec.percentage >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            {rec.percentage || 0}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No progress records found</p>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default StudentProgress;
