/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { AlertCircle } from "lucide-react";
import { useHifz } from "../../contexts/HifzContext";
import logo from "../../assets/images/logo.png";

const getConditionLabel = (report) => {
  if (report?.condition) return report.condition;
  return "";
};

const StudentMonthlyReport = ({
  studentId,
  studentName,
  rollNumber = "N/A",
  teacherName = "N/A",
  onEditClick,
  onDownload,
}) => {
  const {
    fetchMonthlyReports,
    getStudentReports,
    loading,
    error,
    clearError,
    createReport,
    editReport,
    canWrite: canUpdate // we use canWrite for CRUD overrides
  } = useHifz();

  const canReadReport = true;
  const canCreateReport = canUpdate;
  const canUpdateReport = canUpdate;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    sabaq: "",
    sabaqMistakes: 0,
    sabqi: "",
    sabqiMistakes: 0,
    manzil: "",
    manzilMistakes: 0,
    attendance: "Present",
  });
  const [editReportId, setEditReportId] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const reports = getStudentReports(studentId) || [];

  const handleFetchReports = () => {
    if (studentId) {
      fetchMonthlyReports(studentId, selectedMonth, selectedYear);
    }
  };

  useEffect(() => {
    handleFetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, selectedMonth, selectedYear]);

  const generateTableData = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const mStr = String(selectedMonth).padStart(2, "0");
      const dStr = String(day).padStart(2, "0");
      const dateStr = `${selectedYear}-${mStr}-${dStr}`;

      const report = reports.find((r) => {
        const reportDate = new Date(r.date);
        return reportDate.toISOString().split("T")[0] === dateStr;
      });

      const isFriday = new Date(dateStr).getDay() === 5;
      if (isFriday) {
        return { date: dateStr, isFriday: true };
      }

      const condition = report ? getConditionLabel(report) : "";

      return report
        ? { ...report, date: dateStr, condition }
        : {
          date: dateStr,
          sabaq: "",
          sabaqMistakes: 0,
          sabqi: "",
          sabqiMistakes: 0,
          manzil: "",
          manzilMistakes: 0,
          condition: "",
          attendance: "",
        };
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "sabaq") {
      if (value === "" || /^\d+$/.test(value)) {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({
        ...formData,
        [name]: name.includes("Mistakes") ? Number(value) : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editReportId && !canUpdateReport) {
      alert("You do not have permission to update reports.");
      return;
    }
    if (!editReportId && !canCreateReport) {
      alert("You do not have permission to create reports.");
      return;
    }

    const reportData = {
      ...formData,
      date: formData.date || new Date().toISOString().split("T")[0],
      sabaq: formData.attendance === "Present" ? formData.sabaq : "",
      sabaqMistakes: formData.attendance === "Present" ? Number(formData.sabaqMistakes) : 0,
      sabqi: formData.attendance === "Present" ? formData.sabqi : "",
      sabqiMistakes: formData.attendance === "Present" ? Number(formData.sabqiMistakes) : 0,
      manzil: formData.attendance === "Present" ? formData.manzil : "",
      manzilMistakes: formData.attendance === "Present" ? Number(formData.manzilMistakes) : 0,
      // condition is derived by the backend anyway
    };

    let result;
    if (editReportId) {
      result = await editReport(studentId, editReportId, reportData);
    } else {
      result = await createReport(studentId, reportData);
    }

    if (result.success) {
      handleFetchReports();
      setFormData({
        date: new Date().toISOString().split("T")[0],
        sabaq: "",
        sabaqMistakes: 0,
        sabqi: "",
        sabqiMistakes: 0,
        manzil: "",
        manzilMistakes: 0,
        attendance: "Present",
      });
      setEditReportId(null);
    } else {
      alert(result.error || "Failed to save report.");
    }
  };

  const handleEditClick = (report) => {
    if (!canUpdateReport) {
      alert("You do not have permission to update reports.");
      return;
    }
    // Handle both id (from new Prisma model) or _id (from legacy model)
    const rid = report.id || report._id;
    setEditReportId(rid);
    setFormData({
      date: report.date ? new Date(report.date).toISOString().split("T")[0] : "",
      sabaq: report.sabaq || "",
      sabaqMistakes: report.sabaqMistakes || 0,
      sabqi: report.sabqi || "",
      sabqiMistakes: report.sabqiMistakes || 0,
      manzil: report.manzil || "",
      manzilMistakes: report.manzilMistakes || 0,
      attendance: report.attendance || "Present",
    });
    // Scroll form into view gently
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportToPDF = async () => {
    if (!canReadReport) {
      alert("You do not have permission to view or export reports.");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    doc.setFontSize(18);
    doc.text("Jamia Abi Bakar (R.A)", 105, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text(`Student Name: ${studentName || "N/A"}`, 105, 25, { align: "center" });
    doc.text(`Roll Number: ${rollNumber}`, 160, 35, { align: "left" });
    doc.text(`Teacher Name: ${teacherName}`, 90, 35, { align: "right" });

    const tableData = generateTableData();

    autoTable(doc, {
      startY: 45,
      head: [
        [
          "Date",
          "Sabaq",
          "Mistakes",
          "Sabqi",
          "Mistakes",
          "Manzil",
          "Mistakes",
          "Condition",
          "Attendance",
        ],
      ],
      body: tableData.map((report) => {
        if (report.isFriday) {
          return [
            {
              content: "Jumma tul Mubarik",
              colSpan: 9,
              styles: {
                fillColor: [255, 255, 0],
                textColor: [0, 0, 0],
                halign: "center",
                fontStyle: "bold",
              },
            },
          ];
        }
        return [
          new Date(report.date).toLocaleDateString(),
          report.sabaq,
          report.sabaqMistakes,
          report.sabqi,
          report.sabqiMistakes,
          report.manzil,
          report.manzilMistakes,
          report.condition,
          report.attendance,
        ];
      }),
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
      },
      bodyStyles: {
        halign: "center",
        fontSize: 8,
      },
      theme: "grid",
      styles: {
        cellPadding: 2,
        fontSize: 8,
      },
      margin: { top: 45, left: 10, right: 10 },
      tableWidth: "auto",
      didDrawPage: (data) => {
        if (logo) {
          try {
            const imgWidth = 120;
            const imgHeight = 120;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.1 }));
            doc.addImage(logo, "PNG", x, y, imgWidth, imgHeight);
            doc.restoreGraphicsState();
          } catch (e) {
            console.error("Could not load logo in pdf:", e);
          }
        }
      },
    });

    // Make safe name
    const safeName = studentName ? studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'student';
    doc.save(`${safeName}_monthly_report.pdf`);
  };

  return (
    <div className="p-4 max-w-screen-lg mx-auto bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center mb-4 text-[#283B61]">
        Jamia Abi Bakar (R.A)
      </h1>

      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-[#283B61]">{studentName || "N/A"}</h2>
        <p className="text-lg text-[#6E52FD]">Roll Number: {rollNumber}</p>
        <p className="text-lg text-[#6E52FD]">Teacher Name: {teacherName}</p>
      </div>

      {!canCreateReport && !editReportId && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          You do not have permission to create new reports.
        </div>
      )}
      {!canUpdateReport && editReportId && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          You do not have permission to update reports.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
          <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#283B61]">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(selectedYear, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#283B61]">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleFetchReports}
            className="px-4 py-2 mt-auto w-full rounded-md transition-colors bg-[#6E52FD] text-white hover:bg-[#5A43D6]"
          >
            Filter
          </button>
        </div>
      </div>

      <button
        onClick={exportToPDF}
        className="mb-4 px-4 py-2 rounded-md transition-colors bg-[#F4C259] text-[#283B61] hover:bg-[#F4C259]/80 cursor-pointer"
      >
        Export to PDF
      </button>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#283B61]">Attendance</label>
            <select
              name="attendance"
              value={formData.attendance}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
              required
              disabled={editReportId ? !canUpdateReport : !canCreateReport}
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>
          </div>

          {formData.attendance === "Present" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#283B61]">Sabaq lines</label>
                <input
                  type="text"
                  name="sabaq"
                  value={formData.sabaq}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
                  disabled={editReportId ? !canUpdateReport : !canCreateReport}
                  pattern="[0-9]*" inputMode="numeric" title="Please enter numbers only"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#283B61]">Sabaq Mistakes</label>
                <input
                  type="number"
                  name="sabaqMistakes"
                  value={formData.sabaqMistakes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
                  disabled={editReportId ? !canUpdateReport : !canCreateReport}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#283B61]">Sabqi</label>
                <input
                  type="text"
                  name="sabqi"
                  value={formData.sabqi}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
                  disabled={editReportId ? !canUpdateReport : !canCreateReport}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#283B61]">Sabqi Mistakes</label>
                <input
                  type="number"
                  name="sabqiMistakes"
                  value={formData.sabqiMistakes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
                  disabled={editReportId ? !canUpdateReport : !canCreateReport}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#283B61]">Manzil</label>
                <input
                  type="text"
                  name="manzil"
                  value={formData.manzil}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
                  disabled={editReportId ? !canUpdateReport : !canCreateReport}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#283B61]">Manzil Mistakes</label>
                <input
                  type="number"
                  name="manzilMistakes"
                  value={formData.manzilMistakes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
                  disabled={editReportId ? !canUpdateReport : !canCreateReport}
                  min="0"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-[#283B61]">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              max={new Date().toISOString().split("T")[0]}
              className="mt-1 block w-full px-3 py-2 border border-[#6E52FD] rounded-md shadow-sm focus:outline-none focus:ring-[#6E52FD]"
              required
              disabled={editReportId ? !canUpdateReport : !canCreateReport}
            />
          </div>
        </div>

        <button
          type="submit"
          className={`mt-4 px-4 py-2 rounded-md transition-colors ${(editReportId && canUpdateReport) || (!editReportId && canCreateReport)
              ? "bg-[#6E52FD] text-white hover:bg-[#5A43D6] cursor-pointer"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          disabled={editReportId ? !canUpdateReport : !canCreateReport}
        >
          {editReportId ? "Update Report" : "Add Report"}
        </button>
      </form>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading reports...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead className="bg-[#FEECC8]">
              <tr>
                <th className="lg:w-[12%] w-[13%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Date</th>
                <th className="lg:w-[10%] w-[9%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Sabaq</th>
                <th className="lg:w-[9%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Mistakes</th>
                <th className="lg:w-[12%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Sabqi</th>
                <th className="lg:w-[9%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Mistakes</th>
                <th className="lg:w-[10%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Manzil</th>
                <th className="lg:w-[9%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Mistakes</th>
                <th className="lg:w-[12%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Condition</th>
                <th className="lg:w-[12%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Attendance</th>
                <th className="lg:w-[8%] px-1 py-1 border border-[#6E52FD] text-center lg:text-[10px] text-[8px] font-medium text-[#283B61] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {generateTableData().map((report, index) => {
                if (report.isFriday) {
                  return (
                    <tr key={index}>
                      <td colSpan={10} className="px-6 py-2 border border-[#6E52FD] text-center text-xs font-bold text-[#283B61] bg-[#F4C259]/20">
                        Jumma tul Mubarik
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={index} className="hover:bg-amber-50">
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-[12px] text-[9px] font-medium text-[#283B61]">
                      {new Date(report.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] text-gray-700">{report.sabaq}</td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] text-gray-700">
                      {report.sabaqMistakes > 0 ? <span className="text-red-600 font-bold">{report.sabaqMistakes}</span> : report.sabaqMistakes}
                    </td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] text-gray-700">{report.sabqi}</td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] text-gray-700">
                      {report.sabqiMistakes > 0 ? <span className="text-red-600 font-bold">{report.sabqiMistakes}</span> : report.sabqiMistakes}
                    </td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] text-gray-700">{report.manzil}</td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] text-gray-700">
                      {report.manzilMistakes > 0 ? <span className="text-red-600 font-bold">{report.manzilMistakes}</span> : report.manzilMistakes}
                    </td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] font-medium text-[#283B61]">{report.condition}</td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] font-bold text-gray-800">{report.attendance}</td>
                    <td className="px-3 py-3 border border-[#6E52FD] text-center lg:text-xs text-[9px] text-[#283B61]">
                      {report.id && canUpdateReport && (
                        <button
                          onClick={() => handleEditClick(report)}
                          className="px-2 py-1 rounded bg-[#6E52FD] text-white hover:bg-[#5A43D6] transition-colors"
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
      )}
    </div>
  );
};

export default StudentMonthlyReport;