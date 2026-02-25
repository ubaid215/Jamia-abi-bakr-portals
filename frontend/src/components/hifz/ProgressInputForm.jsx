// components/hifz/HifzDailyReportForm.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Save,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  UserCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Percent,
} from "lucide-react";
import { useHifz } from "../../contexts/HifzContext";
import { useAuth } from "../../contexts/AuthContext";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const deriveCondition = (attendance, sM, sqM, mM) => {
  if (attendance !== "PRESENT") return "N/A";
  const s = parseInt(sM) || 0;
  const sq = parseInt(sqM) || 0;
  const m = parseInt(mM) || 0;
  if (s > 2 || sq > 2 || m > 3) return "Below Average";
  if (s > 0 || sq > 1 || m > 1) return "Medium";
  if (s === 0 && sq === 0 && m === 0) return "Excellent";
  return "Good";
};

const conditionStyle = (c) => {
  switch (c) {
    case "Excellent": return "bg-green-100 text-green-800 border-green-300";
    case "Good": return "bg-blue-100  text-blue-800  border-blue-300";
    case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "Below Average": return "bg-red-100   text-red-800   border-red-300";
    default: return "bg-gray-100   text-gray-500  border-gray-300";
  }
};

const INITIAL_FORM = {
  date: new Date().toISOString().split("T")[0],
  sabaq: "",
  sabaqLines: 0,
  sabaqMistakes: 0,
  sabqi: "",
  sabqiMistakes: 0,
  manzil: "",
  manzilMistakes: 0,
  attendance: "PRESENT",
  currentPara: 1,
  currentParaProgress: 0,
  notes: "",
  remarks: "",
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
/**
 * Props (optional — falls back to useParams if not provided)
 *   studentId        {string}
 *   hifzStatus       {object}   – from parent (currentPara, completedParas, alreadyMemorizedParas)
 *   onSaveSuccess    {Function} – called after a successful save
 */
const ProgressInputForm = ({ studentId: propStudentId, hifzStatus, onSaveSuccess }) => {
  const { id: paramId } = useParams();
  const studentId = propStudentId || paramId;

  const { user } = useAuth();
  const {
    createReport,
    editReport,
    actionLoading,
    error,
    successMessage,
    clearError,
    canWrite, // Extract canWrite here
  } = useHifz();

  const canCreate = canWrite; // Use standard contextual permission
  const canUpdate = canWrite; // Use standard contextual permission

  const [form, setForm] = useState(INITIAL_FORM);
  const [editReportId, setEditReportId] = useState(null);

  // Derived
  const isPresent = form.attendance === "PRESENT";
  const condition = deriveCondition(form.attendance, form.sabaqMistakes, form.sabqiMistakes, form.manzilMistakes);
  const totalMistakes = (parseInt(form.sabaqMistakes) || 0) + (parseInt(form.sabqiMistakes) || 0) + (parseInt(form.manzilMistakes) || 0);
  const canSubmit = editReportId ? canUpdate : canCreate;

  // All memorized paras (already + completed)
  const allMemorized = [
    ...(hifzStatus?.alreadyMemorizedParas || []),
    ...(hifzStatus?.completedParas || []),
  ];

  // Sync currentPara from hifzStatus
  useEffect(() => {
    if (hifzStatus?.currentPara) {
      setForm((prev) => ({ ...prev, currentPara: hifzStatus.currentPara }));
    }
  }, [hifzStatus?.currentPara]);

  // ── Handlers ──────────────────────────────────────────────
  const set = (field, value) => {
    const numericFields = [
      "sabaqLines", "sabaqMistakes", "sabqiMistakes",
      "manzilMistakes", "currentPara", "currentParaProgress",
    ];
    setForm((prev) => ({
      ...prev,
      [field]: numericFields.includes(field) ? (Number(value) || 0) : value,
    }));
  };

  const resetForm = () => {
    setForm({
      ...INITIAL_FORM,
      currentPara: hifzStatus?.currentPara || 1,
    });
    setEditReportId(null);
  };

  // eslint-disable-next-line no-unused-vars
  const loadForEdit = (report) => {
    if (!canUpdate) return alert("You do not have permission to update reports.");
    setEditReportId(report.id);
    setForm({
      date: report.date ? new Date(report.date).toISOString().split("T")[0] : "",
      sabaq: report.sabaq || "",
      sabaqLines: report.sabaqLines || 0,
      sabaqMistakes: report.sabaqMistakes || 0,
      sabqi: report.sabqi || "",
      sabqiMistakes: report.sabqiMistakes || 0,
      manzil: report.manzil || "",
      manzilMistakes: report.manzilMistakes || 0,
      attendance: report.attendance || "PRESENT",
      currentPara: report.currentPara || 1,
      currentParaProgress: report.currentParaProgress || 0,
      notes: report.notes || "",
      remarks: report.remarks || "",
    });
    // scroll to form
    document.getElementById("hifz-report-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return alert("You do not have permission to perform this action.");

    const payload = {
      date: form.date,
      attendance: form.attendance,
      sabaq: isPresent ? form.sabaq : "",
      sabaqLines: isPresent ? form.sabaqLines : 0,
      sabaqMistakes: isPresent ? form.sabaqMistakes : 0,
      sabqi: isPresent ? form.sabqi : "",
      sabqiMistakes: isPresent ? form.sabqiMistakes : 0,
      manzil: isPresent ? form.manzil : "",
      manzilMistakes: isPresent ? form.manzilMistakes : 0,
      currentPara: form.currentPara,
      currentParaProgress: form.currentParaProgress,
      notes: form.notes,
      remarks: form.remarks,
    };

    let result;
    if (editReportId) {
      result = await editReport(studentId, editReportId, payload);
    } else {
      result = await createReport(studentId, payload);
    }

    if (result.success) {
      resetForm();
      onSaveSuccess?.();
    }
  };

  // ── Permission banners ────────────────────────────────────
  if (!canCreate && !canUpdate) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        You do not have permission to create or update reports.
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      id="hifz-report-form"
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          {editReportId ? "✏️ Update Report" : "📋 Record Daily Progress"}
        </h2>
        <div className="flex gap-4 text-right text-sm">
          <div>
            <div className="text-xs text-gray-400">Current Para</div>
            <div className="font-bold text-amber-600">Para {form.currentPara}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Memorized</div>
            <div className="font-bold text-green-600">{allMemorized.length}/30</div>
          </div>
        </div>
      </div>

      {/* Error / success banners */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {successMessage}
        </div>
      )}

      {/* Live condition preview */}
      <div className={`mb-5 p-3 rounded-lg border flex items-center justify-between ${conditionStyle(condition)}`}>
        <div className="flex items-center gap-2 font-medium text-sm">
          {condition === "Excellent" && <TrendingUp size={16} />}
          {condition === "Below Average" && <TrendingDown size={16} />}
          {(condition === "Medium" || condition === "Good") && <Minus size={16} />}
          Condition: {condition}
        </div>
        {isPresent && (
          <span className="text-xs opacity-75">
            Mistakes: {totalMistakes} &nbsp;|&nbsp; Lines: {form.sabaqLines}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Basic Info ── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Calendar size={13} /> Basic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => set("date", e.target.value)}
                disabled={!canSubmit}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Attendance */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <UserCheck size={12} /> Attendance
              </label>
              <select
                value={form.attendance}
                onChange={(e) => set("attendance", e.target.value)}
                disabled={!canSubmit}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EXCUSED">Excused</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Section 2: Sabaq / Sabqi / Manzil ── */}
        {isPresent && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <BookOpen size={13} /> Lesson Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Sabaq */}
              <div className="rounded-xl border border-emerald-100 overflow-hidden shadow-sm">
                <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
                  <span className="font-semibold text-emerald-900 text-sm flex items-center gap-1.5">
                    <BookOpen size={14} className="text-emerald-600" /> Sabaq
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-white px-2 py-0.5 rounded border border-emerald-100">
                    New Lesson
                  </span>
                </div>
                <div className="p-4 space-y-3 bg-white">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Description</label>
                    <input
                      type="text"
                      value={form.sabaq}
                      onChange={(e) => set("sabaq", e.target.value)}
                      placeholder="e.g. Surah Al-Baqarah v1–5"
                      disabled={!canSubmit}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Lines</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={form.sabaqLines}
                          onChange={(e) => set("sabaqLines", e.target.value)}
                          disabled={!canSubmit}
                          className="w-full text-sm font-bold text-center px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {[5, 10, 15].map((v) => (
                          <button key={v} type="button" onClick={() => set("sabaqLines", v)}
                            disabled={!canSubmit}
                            className="flex-1 text-[10px] bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 rounded py-1 transition-colors disabled:opacity-40">
                            {v}L
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Mistakes</label>
                      <input
                        type="number"
                        min="0"
                        value={form.sabaqMistakes}
                        onChange={(e) => set("sabaqMistakes", e.target.value)}
                        disabled={!canSubmit}
                        className={`w-full text-sm font-bold text-center px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed ${form.sabaqMistakes > 0 ? "bg-red-50 border-red-200 text-red-600" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                      />
                      <div className="flex gap-1 mt-1.5">
                        {[0, 1, 2].map((v) => (
                          <button key={v} type="button" onClick={() => set("sabaqMistakes", v)}
                            disabled={!canSubmit}
                            className="flex-1 text-[10px] bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded py-1 transition-colors disabled:opacity-40">
                            {v}M
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sabqi */}
              <div className="rounded-xl border border-blue-100 overflow-hidden shadow-sm">
                <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex items-center justify-between">
                  <span className="font-semibold text-blue-900 text-sm flex items-center gap-1.5">
                    <BookOpen size={14} className="text-blue-600" /> Sabqi
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100">
                    Revision
                  </span>
                </div>
                <div className="p-4 space-y-3 bg-white">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Description</label>
                    <input
                      type="text"
                      value={form.sabqi}
                      onChange={(e) => set("sabqi", e.target.value)}
                      placeholder="e.g. Para 2"
                      disabled={!canSubmit}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mistakes</label>
                    <input
                      type="number"
                      min="0"
                      value={form.sabqiMistakes}
                      onChange={(e) => set("sabqiMistakes", e.target.value)}
                      disabled={!canSubmit}
                      className={`w-full text-sm font-bold text-center px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed ${form.sabqiMistakes > 0 ? "bg-red-50 border-red-200 text-red-600" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                    />
                    <div className="flex gap-1 mt-1.5">
                      {[0, 1, 2].map((v) => (
                        <button key={v} type="button" onClick={() => set("sabqiMistakes", v)}
                          disabled={!canSubmit}
                          className="flex-1 text-[10px] bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded py-1 transition-colors disabled:opacity-40">
                          {v}M
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manzil */}
              <div className="rounded-xl border border-purple-100 overflow-hidden shadow-sm">
                <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-100 flex items-center justify-between">
                  <span className="font-semibold text-purple-900 text-sm flex items-center gap-1.5">
                    <BookOpen size={14} className="text-purple-600" /> Manzil
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-white px-2 py-0.5 rounded border border-purple-100">
                    Old Revision
                  </span>
                </div>
                <div className="p-4 space-y-3 bg-white">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Description</label>
                    <input
                      type="text"
                      value={form.manzil}
                      onChange={(e) => set("manzil", e.target.value)}
                      placeholder="e.g. Para 1–5"
                      disabled={!canSubmit}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mistakes</label>
                    <input
                      type="number"
                      min="0"
                      value={form.manzilMistakes}
                      onChange={(e) => set("manzilMistakes", e.target.value)}
                      disabled={!canSubmit}
                      className={`w-full text-sm font-bold text-center px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed ${form.manzilMistakes > 0 ? "bg-red-50 border-red-200 text-red-600" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                    />
                    <div className="flex gap-1 mt-1.5">
                      {[0, 1, 2].map((v) => (
                        <button key={v} type="button" onClick={() => set("manzilMistakes", v)}
                          disabled={!canSubmit}
                          className="flex-1 text-[10px] bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded py-1 transition-colors disabled:opacity-40">
                          {v}M
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>


            {/* ── Notes ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Teacher Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  disabled={!canSubmit}
                  placeholder="Internal notes..."
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Remarks for Parent
                </label>
                <textarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  disabled={!canSubmit}
                  placeholder="Shared with parents..."
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-amber-500" />
            Condition: <span className="font-semibold text-gray-700">{condition}</span>
            {isPresent && (
              <span className="ml-2 text-gray-400">
                · Lines: {form.sabaqLines} · Mistakes: {totalMistakes}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={actionLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw size={14} /> Reset
            </button>

            <button
              type="submit"
              disabled={actionLoading || !canSubmit}
              className={`px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 min-w-[130px] justify-center transition-all ${actionLoading || !canSubmit
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 shadow-sm hover:shadow-md"
                }`}
            >
              {actionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={14} />
                  {editReportId ? "Update Report" : "Save Report"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Expose loadForEdit via ref for parent-driven edit triggering
export { ProgressInputForm };
export default ProgressInputForm;