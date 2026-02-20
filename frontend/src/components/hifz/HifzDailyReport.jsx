/* eslint-disable react-hooks/exhaustive-deps */
// HifzDailyReport.jsx
// Mirrors the original DailyReport.jsx pattern — simple form + monthly table
// Adapted for the new Hifz schema (sabaqLines, sabqi as string, manzil as string)

import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
// import logo from "../assets/logo.png"; // Uncomment and set your logo path

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// ─── Condition helper (mirrors backend logic exactly) ─────────────────────────
const getCondition = ({ attendance, sabaqMistakes, sabqiMistakes, manzilMistakes }) => {
  if (attendance !== "PRESENT" && attendance !== "Present") return "N/A";
  const sm = Number(sabaqMistakes) || 0;
  const sqm = Number(sabqiMistakes) || 0;
  const mm = Number(manzilMistakes) || 0;
  if (sm > 2 || sqm > 2 || mm > 3) return "Below Average";
  if (sm > 0 || sqm > 1 || mm > 1) return "Medium";
  if (sm === 0 && sqm === 0 && mm === 0) return "Excellent";
  return "Good";
};

const conditionBadge = (condition) => {
  const map = {
    Excellent: "bg-green-100 text-green-800",
    Good: "bg-blue-100 text-blue-800",
    Medium: "bg-yellow-100 text-yellow-800",
    "Below Average": "bg-red-100 text-red-800",
    "N/A": "bg-gray-100 text-gray-500",
  };
  return map[condition] || "bg-gray-100 text-gray-500";
};

// ─── Empty form state ─────────────────────────────────────────────────────────
const emptyForm = () => ({
  date: new Date().toISOString().split("T")[0],
  attendance: "PRESENT",
  // Sabaq — new memorization
  sabaq: "",          // description e.g. "Al-Baqarah v1-5"
  sabaqLines: 0,      // KEY METRIC: number of new lines
  sabaqMistakes: 0,
  // Sabqi — recent revision (description only, no line count)
  sabqi: "",
  sabqiMistakes: 0,
  // Manzil — older revision (description only, no line count)
  manzil: "",
  manzilMistakes: 0,
  // Para tracking
  currentPara: 1,
  currentParaProgress: 0,
  notes: "",
  remarks: "",
});

// ─── Main Component ───────────────────────────────────────────────────────────
const HifzDailyReport = () => {
  const { studentId } = useParams(); // expects /hifz/:studentId/report
  const token = () => localStorage.getItem("token");

  const [student, setStudent] = useState({ name: "", admissionNo: "", hifzStatus: null });
  const [formData, setFormData] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // ── Fetch student details ──────────────────────────────────────────────────
  const fetchStudent = async () => {
    try {
      const { data } = await axios.get(
        `${VITE_BACKEND_URL}/api/hifz/students/${studentId}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (data.success) {
        setStudent({
          name: data.student?.user?.name || "",
          admissionNo: data.student?.admissionNo || "",
          hifzStatus: data.student?.hifzStatus || null,
        });
        // Pre-fill current para from status
        if (data.student?.hifzStatus?.currentPara) {
          setFormData((prev) => ({
            ...prev,
            currentPara: data.student.hifzStatus.currentPara,
            currentParaProgress: data.student.hifzStatus.currentParaProgress || 0,
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching student:", err);
    }
  };

  // ── Fetch monthly reports ─────────────────────────────────────────────────
  const fetchMonthlyReports = async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];

      const { data } = await axios.get(
        `${VITE_BACKEND_URL}/api/hifz/students/${studentId}/progress`,
        {
          params: { startDate, endDate, limit: 31 },
          headers: { Authorization: `Bearer ${token()}` },
        }
      );
      if (data.success) {
        const sorted = [...(data.progress || [])].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
        setReports(sorted);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  useEffect(() => { fetchStudent(); }, [studentId]);
  useEffect(() => { fetchMonthlyReports(); }, [studentId, selectedMonth, selectedYear]);

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    const numeric = ["sabaqLines", "sabaqMistakes", "sabqiMistakes", "manzilMistakes", "currentPara", "currentParaProgress"];
    setFormData((prev) => ({
      ...prev,
      [name]: numeric.includes(name) ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      // Clear hifz-specific fields if absent
      sabaq: formData.attendance === "PRESENT" ? formData.sabaq : "",
      sabaqLines: formData.attendance === "PRESENT" ? formData.sabaqLines : 0,
      sabaqMistakes: formData.attendance === "PRESENT" ? formData.sabaqMistakes : 0,
      sabqi: formData.attendance === "PRESENT" ? formData.sabqi : "",
      sabqiMistakes: formData.attendance === "PRESENT" ? formData.sabqiMistakes : 0,
      manzil: formData.attendance === "PRESENT" ? formData.manzil : "",
      manzilMistakes: formData.attendance === "PRESENT" ? formData.manzilMistakes : 0,
    };

    try {
      if (editId) {
        await axios.put(
          `${VITE_BACKEND_URL}/api/hifz/students/${studentId}/progress/${editId}`,
          payload,
          { headers: { Authorization: `Bearer ${token()}` } }
        );
      } else {
        await axios.post(
          `${VITE_BACKEND_URL}/api/hifz/students/${studentId}/progress`,
          payload,
          { headers: { Authorization: `Bearer ${token()}` } }
        );
      }
      setFormData(emptyForm());
      setEditId(null);
      await fetchMonthlyReports();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save report.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (report) => {
    setEditId(report.id);
    setFormData({
      date: new Date(report.date).toISOString().split("T")[0],
      attendance: report.attendance || "PRESENT",
      sabaq: report.sabaq || "",
      sabaqLines: report.sabaqLines || 0,
      sabaqMistakes: report.sabaqMistakes || 0,
      sabqi: report.sabqi || "",
      sabqiMistakes: report.sabqiMistakes || 0,
      manzil: report.manzil || "",
      manzilMistakes: report.manzilMistakes || 0,
      currentPara: report.currentPara || 1,
      currentParaProgress: report.currentParaProgress || 0,
      notes: report.notes || "",
      remarks: report.remarks || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Generate full month table rows (fills missing days) ──────────────────
  const generateTableRows = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const report = reports.find((r) => {
        const d = new Date(r.date);
        return d.toISOString().split("T")[0] === dateStr;
      });
      const isFriday = new Date(dateStr).getDay() === 5;
      return { dateStr, report, isFriday };
    });
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const exportToPDF = () => {
    const doc = new jsPDF("l", "mm", "a4"); // landscape for wider table

    doc.setFontSize(16);
    doc.text("Khanqah Saifia — Hifz Progress Report", doc.internal.pageSize.getWidth() / 2, 14, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Student: ${student.name}  |  Admission No: ${student.admissionNo}`, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });
    doc.text(
      `Month: ${new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}`,
      doc.internal.pageSize.getWidth() / 2, 29, { align: "center" }
    );

    const rows = generateTableRows().map(({ dateStr, report, isFriday }) => {
      if (isFriday) {
        return [{ content: "Jumma-tul-Mubarak", colSpan: 11, styles: { fillColor: [255, 243, 176], halign: "center", fontStyle: "bold", textColor: [120, 80, 0] } }];
      }
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dateLabel = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;

      if (!report) {
        return [dateLabel, dayName, "", "", "", "", "", "", "", "", ""];
      }

      const isAbsent = report.attendance !== "PRESENT" && report.attendance !== "Present";
      if (isAbsent) {
        return [
          dateLabel, dayName,
          { content: report.attendance, colSpan: 9, styles: { halign: "center", textColor: [180, 0, 0], fontStyle: "bold" } }
        ];
      }

      const condition = getCondition(report);
      return [
        dateLabel,
        dayName,
        report.sabaq || "",
        report.sabaqLines ?? "",
        report.sabaqMistakes ?? "",
        report.sabqi || "",
        report.sabqiMistakes ?? "",
        report.manzil || "",
        report.manzilMistakes ?? "",
        condition,
        report.currentPara ? `Para ${report.currentPara} (${report.currentParaProgress || 0}%)` : "",
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [[
        "Date", "Day",
        "Sabaq (New)", "Lines", "Mistakes",
        "Sabqi (Revision)", "Mistakes",
        "Manzil (Old Rev.)", "Mistakes",
        "Condition", "Para Progress"
      ]],
      body: rows,
      headStyles: { fillColor: [30, 54, 100], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8 },
      bodyStyles: { halign: "center", fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 22, halign: "left" },
        1: { cellWidth: 12 },
        2: { cellWidth: 38, halign: "left" },
        3: { cellWidth: 12 },
        4: { cellWidth: 16 },
        5: { cellWidth: 30, halign: "left" },
        6: { cellWidth: 16 },
        7: { cellWidth: 30, halign: "left" },
        8: { cellWidth: 16 },
        9: { cellWidth: 24 },
        10: { cellWidth: 28 },
      },
      theme: "grid",
      margin: { top: 35, left: 8, right: 8 },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.raw) {
          const condition = data.row.raw[9];
          if (data.column.index === 9) {
            if (condition === "Excellent") data.cell.styles.textColor = [22, 101, 52];
            else if (condition === "Good") data.cell.styles.textColor = [30, 64, 175];
            else if (condition === "Medium") data.cell.styles.textColor = [120, 53, 15];
            else if (condition === "Below Average") data.cell.styles.textColor = [153, 27, 27];
          }
          // Color mistake cells red if > 0
          if ([4, 6, 8].includes(data.column.index)) {
            const val = Number(data.cell.raw);
            if (!isNaN(val) && val > 0) {
              data.cell.styles.textColor = [180, 0, 0];
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
    });

    // Footer signature line
    const finalY = doc.lastAutoTable.finalY + 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(9);
    doc.text("Teacher's Signature: _______________________", pageWidth - 100, finalY);

    doc.save(`${student.name || "student"}_hifz_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.pdf`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const isPresent = formData.attendance === "PRESENT" || formData.attendance === "Present";
  const previewCondition = getCondition(formData);

  return (
    <div className="p-4 max-w-screen-xl mx-auto bg-white shadow-lg rounded-lg">
      {/* ── Header ── */}
      <h1 className="text-2xl font-bold text-center mb-1 text-[#1a365d]">Khanqah Saifia</h1>
      <div className="text-center mb-5">
        <h2 className="text-lg font-semibold text-[#1a365d]">{student.name}</h2>
        <p className="text-sm text-gray-500">Admission No: {student.admissionNo}</p>
        {student.hifzStatus && (
          <p className="text-sm text-amber-700 font-medium">
            Current Para: {student.hifzStatus.currentPara} &nbsp;|&nbsp;
            Completed: {student.hifzStatus.completedParas?.length || 0}/30 paras
          </p>
        )}
      </div>

      {/* ── Month/Year Selector ── */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(selectedYear, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <option key={i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchMonthlyReports}
          className="px-4 py-1.5 bg-[#1a365d] text-white rounded-md text-sm hover:bg-[#2a4a7f] transition-colors"
        >
          Filter
        </button>
        <button
          onClick={exportToPDF}
          className="px-4 py-1.5 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600 transition-colors ml-auto"
        >
          Export PDF
        </button>
      </div>

      {/* ── Input Form ── */}
      <form onSubmit={handleSubmit} className="mb-7 bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h3 className="text-base font-semibold text-[#1a365d] mb-4">
          {editId ? "✏️ Edit Report" : "➕ Add Daily Report"}
        </h3>

        {/* Row 1: Date + Attendance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              max={new Date().toISOString().split("T")[0]}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Attendance *</label>
            <select
              name="attendance"
              value={formData.attendance}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
          {/* Condition preview */}
          <div className="flex items-end col-span-2">
            <div className={`w-full px-3 py-2 rounded-md text-sm font-semibold text-center border ${conditionBadge(previewCondition)}`}>
              Condition: {previewCondition}
            </div>
          </div>
        </div>

        {/* Row 2: Sabaq / Sabqi / Manzil — only shown if PRESENT */}
        {isPresent && (
          <>
            {/* ── Sabaq ── */}
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">📖 Sabaq — New Memorization</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    name="sabaq"
                    value={formData.sabaq}
                    onChange={handleChange}
                    placeholder="e.g. Al-Baqarah v1-5"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lines *</label>
                  <input
                    type="number"
                    name="sabaqLines"
                    value={formData.sabaqLines}
                    onChange={handleChange}
                    min="0"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mistakes</label>
                  <input
                    type="number"
                    name="sabaqMistakes"
                    value={formData.sabaqMistakes}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </div>

            {/* ── Sabqi ── */}
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">🔁 Sabqi — Recent Revision</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    name="sabqi"
                    value={formData.sabqi}
                    onChange={handleChange}
                    placeholder="e.g. Para 2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mistakes</label>
                  <input
                    type="number"
                    name="sabqiMistakes"
                    value={formData.sabqiMistakes}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* ── Manzil ── */}
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">📚 Manzil — Older Revision</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    name="manzil"
                    value={formData.manzil}
                    onChange={handleChange}
                    placeholder="e.g. Para 1-5"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mistakes</label>
                  <input
                    type="number"
                    name="manzilMistakes"
                    value={formData.manzilMistakes}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* ── Para Progress ── */}
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">📊 Para Progress</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Para</label>
                  <select
                    name="currentPara"
                    value={formData.currentPara}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Para {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Progress: {formData.currentParaProgress}%
                  </label>
                  <input
                    type="range"
                    name="currentParaProgress"
                    value={formData.currentParaProgress}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="5"
                    className="w-full mt-1 accent-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input
                    type="text"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Teacher notes..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                  <input
                    type="text"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="For parents..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Submit / Cancel */}
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-[#1a365d] text-white rounded-md text-sm font-medium hover:bg-[#2a4a7f] transition-colors disabled:opacity-60"
          >
            {loading ? "Saving..." : editId ? "Update Report" : "Add Report"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setEditId(null); setFormData(emptyForm()); }}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-100 transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* ── Monthly Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#1a365d] text-white">
            <tr>
              <th className="px-2 py-2 border border-[#2a4a7f] text-left">Date</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">Day</th>
              <th className="px-2 py-2 border border-[#2a4a7f] text-left">Sabaq</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">Lines</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">S.Mist</th>
              <th className="px-2 py-2 border border-[#2a4a7f] text-left">Sabqi</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">Sq.Mist</th>
              <th className="px-2 py-2 border border-[#2a4a7f] text-left">Manzil</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">M.Mist</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">Condition</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">Para</th>
              <th className="px-2 py-2 border border-[#2a4a7f]">Edit</th>
            </tr>
          </thead>
          <tbody>
            {generateTableRows().map(({ dateStr, report, isFriday }, index) => {
              const d = new Date(dateStr);
              const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
              const dateLabel = `${d.getDate()}-${d.getMonth() + 1}`;

              if (isFriday) {
                return (
                  <tr key={dateStr}>
                    <td
                      colSpan={12}
                      className="px-3 py-1.5 text-center text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200"
                    >
                      🕌 Jumma-tul-Mubarak
                    </td>
                  </tr>
                );
              }

              const isAbsent = report && report.attendance !== "PRESENT" && report.attendance !== "Present";
              const condition = report ? getCondition(report) : "";
              const rowBg = !report
                ? "bg-white"
                : isAbsent
                ? "bg-red-50"
                : index % 2 === 0
                ? "bg-white"
                : "bg-gray-50";

              return (
                <tr key={dateStr} className={`${rowBg} hover:bg-amber-50 transition-colors`}>
                  <td className="px-2 py-1.5 border border-gray-200 font-medium text-gray-800 whitespace-nowrap">
                    {dateLabel}
                  </td>
                  <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-500">{dayName}</td>

                  {isAbsent ? (
                    <td
                      colSpan={9}
                      className="px-3 py-1.5 border border-gray-200 text-center font-bold text-red-600"
                    >
                      {report.attendance}
                    </td>
                  ) : (
                    <>
                      {/* Sabaq */}
                      <td className="px-2 py-1.5 border border-gray-200 text-gray-700 max-w-[120px] truncate" title={report?.sabaq}>
                        {report?.sabaq || ""}
                      </td>
                      <td className="px-2 py-1.5 border border-gray-200 text-center font-mono text-gray-800">
                        {report?.sabaqLines ?? ""}
                      </td>
                      <td className={`px-2 py-1.5 border border-gray-200 text-center font-bold ${(report?.sabaqMistakes || 0) > 0 ? "text-red-600" : "text-gray-300"}`}>
                        {report?.sabaqMistakes || ""}
                      </td>
                      {/* Sabqi */}
                      <td className="px-2 py-1.5 border border-gray-200 text-gray-700 max-w-[100px] truncate" title={report?.sabqi}>
                        {report?.sabqi || ""}
                      </td>
                      <td className={`px-2 py-1.5 border border-gray-200 text-center font-bold ${(report?.sabqiMistakes || 0) > 0 ? "text-red-600" : "text-gray-300"}`}>
                        {report?.sabqiMistakes || ""}
                      </td>
                      {/* Manzil */}
                      <td className="px-2 py-1.5 border border-gray-200 text-gray-700 max-w-[100px] truncate" title={report?.manzil}>
                        {report?.manzil || ""}
                      </td>
                      <td className={`px-2 py-1.5 border border-gray-200 text-center font-bold ${(report?.manzilMistakes || 0) > 0 ? "text-red-600" : "text-gray-300"}`}>
                        {report?.manzilMistakes || ""}
                      </td>
                      {/* Condition */}
                      <td className="px-2 py-1.5 border border-gray-200 text-center">
                        {condition && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${conditionBadge(condition)}`}>
                            {condition}
                          </span>
                        )}
                      </td>
                      {/* Para */}
                      <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-600">
                        {report?.currentPara
                          ? `P${report.currentPara} ${report.currentParaProgress ? `(${report.currentParaProgress}%)` : ""}`
                          : ""}
                      </td>
                    </>
                  )}

                  {/* Edit */}
                  <td className="px-2 py-1.5 border border-gray-200 text-center">
                    {report && (
                      <button
                        onClick={() => handleEdit(report)}
                        className="px-2 py-0.5 bg-[#1a365d] text-white rounded text-[10px] hover:bg-[#2a4a7f] transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Monthly summary footer */}
      {reports.length > 0 && (() => {
        const presentRecords = reports.filter(r => r.attendance === "PRESENT" || r.attendance === "Present");
        const totalLines = presentRecords.reduce((s, r) => s + (r.sabaqLines || 0), 0);
        const totalMistakes = presentRecords.reduce((s, r) => s + (r.sabaqMistakes || 0) + (r.sabqiMistakes || 0) + (r.manzilMistakes || 0), 0);
        return (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4 text-xs text-gray-700">
            <span>📅 Present: <strong>{presentRecords.length}</strong> days</span>
            <span>📖 Total New Lines: <strong className="text-emerald-700">{totalLines}</strong></span>
            <span>⚠️ Total Mistakes: <strong className="text-red-600">{totalMistakes}</strong></span>
            <span>
              Avg Lines/Day:{" "}
              <strong className="text-blue-700">
                {presentRecords.length > 0 ? (totalLines / presentRecords.length).toFixed(1) : 0}
              </strong>
            </span>
          </div>
        );
      })()}
    </div>
  );
};

export default HifzDailyReport;