// src/components/hifz/components/ProgressInputForm.jsx
import React, { useState, useEffect } from "react";
import {
  Plus,
  BookOpen,
  Percent,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Save,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  UserCheck,
  FileText,
} from "lucide-react";
import { calculateParaLogic } from "../../utils/paraCalculations";
// import hifzServices from "../../services/hifzServices";

const ProgressInputForm = ({
  selectedStudent,
  hifzStatus,
  calculatedCurrentPara,
  paraVisualization,
  handleMarkParaCompleted,
  isSubmitting,
  setSubmitting,
  hifzLoading,
  saveProgress,
  fetchAnalytics,
}) => {
  const [progressForm, setProgressForm] = useState({
    date: new Date().toISOString().split("T")[0],
    sabaq: "",
    sabaqLines: 0,
    sabaqMistakes: 0,
    sabqi: "",
    sabqiLines: 0,
    sabqiMistakes: 0,
    manzil: "",
    manzilLines: 0,
    manzilMistakes: 0,
    attendance: "PRESENT",
    currentPara: calculatedCurrentPara,
    currentParaProgress: 0,
    notes: "",
    remarks: "",
  });

  // Update current para when calculatedCurrentPara changes
  useEffect(() => {
    if (calculatedCurrentPara) {
      setProgressForm((prev) => ({
        ...prev,
        currentPara: calculatedCurrentPara,
        // Auto-generate descriptions based on para
        sabaq: prev.sabaq || `Para ${calculatedCurrentPara} New Lesson`,
        sabqi:
          prev.sabqi ||
          `Para ${Math.max(1, calculatedCurrentPara - 1)} Revision`,
        manzil:
          prev.manzil ||
          `Para ${Math.max(1, calculatedCurrentPara - 7)} Older Revision`,
      }));
    }
  }, [calculatedCurrentPara]);

  const handleInputChange = (field, value) => {
    setProgressForm((prev) => ({
      ...prev,
      [field]:
        field.includes("Mistakes") ||
        field.includes("Lines") ||
        field.includes("Para") ||
        field.includes("Progress")
          ? Number(value) || 0
          : value,
    }));
  };

  // Calculate total mistakes
  const calculateTotalMistakes = () => {
    return (
      progressForm.sabaqMistakes +
      progressForm.sabqiMistakes +
      progressForm.manzilMistakes
    );
  };

  // Calculate total lines
  const calculateTotalLines = () => {
    return (
      progressForm.sabaqLines +
      progressForm.sabqiLines +
      progressForm.manzilLines
    );
  };

  // Calculate condition using backend logic
  const calculateCondition = () => {
    if (progressForm.attendance !== "PRESENT") {
      return "N/A";
    }

    const totalMistakes = calculateTotalMistakes();

    // Backend condition logic from HifzProgressController
    if (
      progressForm.sabaqMistakes > 2 ||
      progressForm.sabqiMistakes > 2 ||
      progressForm.manzilMistakes > 3
    ) {
      return "Below Average";
    } else if (
      progressForm.sabaqMistakes > 0 ||
      progressForm.sabqiMistakes > 1 ||
      progressForm.manzilMistakes > 1
    ) {
      return "Medium";
    } else if (totalMistakes === 0) {
      return "Excellent";
    } else {
      return "Good";
    }
  };

  // Get condition color
  const getConditionColor = (condition) => {
    switch (condition) {
      case "Excellent":
        return "bg-green-100 text-green-800 border-green-300";
      case "Good":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Below Average":
        return "bg-red-100 text-red-800 border-red-300";
      case "Need Focus":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = [];

    // Check if date is valid
    if (!progressForm.date) {
      errors.push("Date is required");
    }

    // Check if date is not in future

    const selectedDate = new Date(progressForm.date);
    selectedDate.setHours(0, 0, 0, 0); // ✅ MISSING LINE

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate.getTime() > today.getTime()) {
      errors.push("Date cannot be in the future");
    }

    if (progressForm.attendance === "PRESENT") {
      // Lines validation
      if (
        progressForm.sabaqLines < 0 ||
        progressForm.sabqiLines < 0 ||
        progressForm.manzilLines < 0
      ) {
        errors.push("Line counts cannot be negative");
      }

      // Mistakes validation
      if (
        progressForm.sabaqMistakes < 0 ||
        progressForm.sabqiMistakes < 0 ||
        progressForm.manzilMistakes < 0
      ) {
        errors.push("Mistake counts cannot be negative");
      }

      // At least one line should be filled
      if (
        progressForm.sabaqLines === 0 &&
        progressForm.sabqiLines === 0 &&
        progressForm.manzilLines === 0
      ) {
        errors.push(
          "At least one line count is required for present attendance"
        );
      }

      // Current para validation
      if (
        !progressForm.currentPara ||
        progressForm.currentPara < 1 ||
        progressForm.currentPara > 30
      ) {
        errors.push("Current para must be between 1 and 30");
      }

      // Para progress validation
      if (
        progressForm.currentParaProgress < 0 ||
        progressForm.currentParaProgress > 100
      ) {
        errors.push("Para progress must be between 0 and 100");
      }
    }

    return errors;
  };

  const handleSubmitProgress = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      alert("Please select a student first.");
      return;
    }

    // Get the correct student ID
    const studentId = selectedStudent.student?.id || selectedStudent.id;

    // Validate form
    const formErrors = validateForm();
    if (formErrors.length > 0) {
      alert(`Please fix the following errors:\n\n${formErrors.join("\n")}`);
      return;
    }

    // Prepare submission data
    const submissionData = {
      date: progressForm.date,
      sabaq: progressForm.sabaq || `Para ${progressForm.currentPara}`,
      sabaqLines: progressForm.sabaqLines,
      sabaqMistakes: progressForm.sabaqMistakes,
      sabqi:
        progressForm.sabqi ||
        `Para ${Math.max(1, progressForm.currentPara - 1)}`,
      sabqiLines: progressForm.sabqiLines,
      sabqiMistakes: progressForm.sabqiMistakes,
      manzil:
        progressForm.manzil ||
        `Para ${Math.max(1, progressForm.currentPara - 7)}`,
      manzilLines: progressForm.manzilLines,
      manzilMistakes: progressForm.manzilMistakes,
      attendance: progressForm.attendance,
      currentPara: progressForm.currentPara,
      currentParaProgress: progressForm.currentParaProgress,
      notes: progressForm.notes,
      remarks: progressForm.remarks,
    };

    // Set submitting state
    if (setSubmitting) {
      setSubmitting(true);
    }

    try {
      console.log("📤 Submitting progress:", {
        studentId,
        data: submissionData,
      });

      // 🔥 FIXED: Pass TWO parameters - studentId and submissionData
      const result = await saveProgress(studentId, submissionData);

      console.log("✅ Save progress result:", result);

      if (result.success) {
        // Reset form but keep current para
        setProgressForm({
          date: new Date().toISOString().split("T")[0],
          sabaq: "",
          sabaqLines: 0,
          sabaqMistakes: 0,
          sabqi: "",
          sabqiLines: 0,
          sabqiMistakes: 0,
          manzil: "",
          manzilLines: 0,
          manzilMistakes: 0,
          attendance: "PRESENT",
          currentPara: progressForm.currentPara,
          currentParaProgress: 0,
          notes: "",
          remarks: "",
        });

        alert("✅ Daily progress recorded successfully!");

        // Refresh analytics
        if (fetchAnalytics) {
          await fetchAnalytics(studentId, 30);
        }
      } else {
        throw new Error(result.error || "Failed to save progress");
      }
    } catch (error) {
      console.error("❌ Error recording progress:", error);
      alert(`Error: ${error.message}`);
    } finally {
      // Reset submitting state
      if (setSubmitting) {
        setSubmitting(false);
      }
    }
  };

  // Quick input buttons
  const quickLines = [5, 10, 15, 20];
  const quickMistakes = [0, 1, 2, 3, 5];

  // Helper to format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate if today's date already has a report
  const isTodayReported = () => {
    // This would check if a report already exists for today
    // You would need to implement this based on your data
    return false;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gold" />
          Record Daily Progress
        </h2>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs font-medium text-gray-500">
              Current Para
            </div>
            <div className="text-lg font-bold text-gold">
              Para {progressForm.currentPara}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-gray-500">Memorized</div>
            <div className="text-lg font-bold text-green-600">
              {paraVisualization.totalMemorized}/30
            </div>
          </div>
        </div>
      </div>

      {/* Summary Preview */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <FileText className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-blue-900">
              Today's Summary
            </span>
          </div>
          <div className="text-sm text-blue-700">
            {formatDate(progressForm.date)}
            {isTodayReported() && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                Already Reported
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-xs text-gray-600">Total Lines</div>
            <div className="text-lg font-bold text-blue-700">
              {calculateTotalLines()}
            </div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="text-xs text-gray-600">Total Mistakes</div>
            <div className="text-lg font-bold text-red-700">
              {calculateTotalMistakes()}
            </div>
          </div>
        </div>

        <div
          className={`mt-3 p-3 rounded-lg border ${getConditionColor(
            calculateCondition()
          )}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {calculateCondition() === "Excellent" && (
                <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              )}
              {calculateCondition() === "Below Average" && (
                <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
              )}
              {calculateCondition() === "Medium" ||
              calculateCondition() === "Good" ? (
                <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
              ) : null}
              <span className="font-medium">
                Condition: {calculateCondition()}
              </span>
            </div>
            <div className="text-sm opacity-75">
              {progressForm.attendance === "PRESENT"
                ? "Auto-calculated based on mistakes"
                : "N/A - Student absent"}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitProgress} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Date *
              </label>
              <input
                type="date"
                required
                value={progressForm.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 flex items-center">
                <UserCheck className="h-3 w-3 mr-1" />
                Attendance
              </label>
              <select
                value={progressForm.attendance}
                onChange={(e) =>
                  handleInputChange("attendance", e.target.value)
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EXCUSED">Excused</option>
              </select>
            </div>
          </div>
        </div>

        {/* Only show progress fields if present */}
        {progressForm.attendance === "PRESENT" && (
          <>
            {/* Section 2: Sabaq (New Lesson) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-green-500" />
                Sabaq (New Lesson)
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Sabaq Description
                  </label>
                  <input
                    type="text"
                    value={progressForm.sabaq}
                    onChange={(e) => handleInputChange("sabaq", e.target.value)}
                    placeholder="e.g., Surah Al-Baqarah 1-10, Para 4 Ayat 1-15"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      Lines Memorized
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={progressForm.sabaqLines}
                        onChange={(e) =>
                          handleInputChange("sabaqLines", e.target.value)
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      />
                      <div className="flex space-x-1">
                        {quickLines.map((lines) => (
                          <button
                            key={lines}
                            type="button"
                            onClick={() =>
                              handleInputChange("sabaqLines", lines)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                          >
                            +{lines}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      Mistakes
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={progressForm.sabaqMistakes}
                        onChange={(e) =>
                          handleInputChange("sabaqMistakes", e.target.value)
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      />
                      <div className="flex space-x-1">
                        {quickMistakes.map((mistakes) => (
                          <button
                            key={mistakes}
                            type="button"
                            onClick={() =>
                              handleInputChange("sabaqMistakes", mistakes)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                          >
                            {mistakes}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Sabqi (Recent Revision) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                Sabqi (Recent Revision)
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Sabqi Description
                  </label>
                  <input
                    type="text"
                    value={progressForm.sabqi}
                    onChange={(e) => handleInputChange("sabqi", e.target.value)}
                    placeholder="e.g., Para 3 revision, Yesterday's sabaq"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      Lines Revised
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={progressForm.sabqiLines}
                        onChange={(e) =>
                          handleInputChange("sabqiLines", e.target.value)
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      />
                      <div className="flex space-x-1">
                        {quickLines.map((lines) => (
                          <button
                            key={lines}
                            type="button"
                            onClick={() =>
                              handleInputChange("sabqiLines", lines)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                          >
                            +{lines}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      Mistakes
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={progressForm.sabqiMistakes}
                        onChange={(e) =>
                          handleInputChange("sabqiMistakes", e.target.value)
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      />
                      <div className="flex space-x-1">
                        {quickMistakes.map((mistakes) => (
                          <button
                            key={mistakes}
                            type="button"
                            onClick={() =>
                              handleInputChange("sabqiMistakes", mistakes)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                          >
                            {mistakes}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Manzil (Older Revision) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-purple-500" />
                Manzil (Older Revision)
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Manzil Description
                  </label>
                  <input
                    type="text"
                    value={progressForm.manzil}
                    onChange={(e) =>
                      handleInputChange("manzil", e.target.value)
                    }
                    placeholder="e.g., Para 1-2 revision, Weekly revision"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      Lines Revised
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={progressForm.manzilLines}
                        onChange={(e) =>
                          handleInputChange("manzilLines", e.target.value)
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      />
                      <div className="flex space-x-1">
                        {quickLines.map((lines) => (
                          <button
                            key={lines}
                            type="button"
                            onClick={() =>
                              handleInputChange("manzilLines", lines)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                          >
                            +{lines}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      Mistakes
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={progressForm.manzilMistakes}
                        onChange={(e) =>
                          handleInputChange("manzilMistakes", e.target.value)
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                      />
                      <div className="flex space-x-1">
                        {quickMistakes.map((mistakes) => (
                          <button
                            key={mistakes}
                            type="button"
                            onClick={() =>
                              handleInputChange("manzilMistakes", mistakes)
                            }
                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                          >
                            {mistakes}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Para Progress */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 flex items-center">
                <Percent className="h-4 w-4 mr-2 text-amber-500" />
                Para Progress Tracking
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Current Para *
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      required
                      value={progressForm.currentPara}
                      onChange={(e) =>
                        handleInputChange("currentPara", e.target.value)
                      }
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                    >
                      <option value="">Select Para</option>
                      {Array.from({ length: 30 }, (_, i) => {
                        const paraNumber = i + 1;
                        const isMemorized =
                          paraVisualization.allMemorized.includes(paraNumber);
                        const isCurrent = paraNumber === calculatedCurrentPara;

                        return (
                          <option
                            key={paraNumber}
                            value={paraNumber}
                            disabled={isMemorized}
                            className={
                              isMemorized ? "text-gray-400 bg-gray-100" : ""
                            }
                          >
                            Para {paraNumber}
                            {isMemorized ? " ✓ Memorized" : ""}
                            {isCurrent ? " (Current)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleInputChange(
                            "currentPara",
                            Math.max(1, progressForm.currentPara - 1)
                          )
                        }
                        disabled={
                          progressForm.currentPara <= 1 ||
                          paraVisualization.allMemorized.includes(
                            progressForm.currentPara - 1
                          )
                        }
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleInputChange(
                            "currentPara",
                            Math.min(30, progressForm.currentPara + 1)
                          )
                        }
                        disabled={
                          progressForm.currentPara >= 30 ||
                          paraVisualization.allMemorized.includes(
                            progressForm.currentPara + 1
                          )
                        }
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 flex items-center">
                    <Percent className="h-3 w-3 mr-1" />
                    Para Progress (%)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progressForm.currentParaProgress}
                      onChange={(e) =>
                        handleInputChange("currentParaProgress", e.target.value)
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="w-16 text-center">
                      <span className="text-lg font-bold text-amber-600">
                        {progressForm.currentParaProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Para Quick Actions */}
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-amber-900">
                        Para {progressForm.currentPara} Progress
                      </div>
                      <div className="text-xs text-amber-700">
                        {progressForm.currentParaProgress}% complete
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleMarkParaCompleted(progressForm.currentPara)
                    }
                    disabled={
                      progressForm.currentParaProgress < 100 ||
                      paraVisualization.allMemorized.includes(
                        progressForm.currentPara
                      )
                    }
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Section 6: Notes and Remarks */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 flex items-center">
            <FileText className="h-4 w-4 mr-2 text-gray-500" />
            Additional Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Teacher Notes
              </label>
              <textarea
                value={progressForm.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Observation, improvements, encouragement..."
                rows="3"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Remarks
              </label>
              <textarea
                value={progressForm.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                placeholder="Special remarks, issues, or follow-up needed..."
                rows="3"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="pt-4 border-t">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                <span>
                  Condition:{" "}
                  <span className="font-semibold">{calculateCondition()}</span>
                  {progressForm.attendance === "PRESENT" &&
                    ` • Total Lines: ${calculateTotalLines()} • Total Mistakes: ${calculateTotalMistakes()}`}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  // Reset form
                  setProgressForm({
                    date: new Date().toISOString().split("T")[0],
                    sabaq: "",
                    sabaqLines: 0,
                    sabaqMistakes: 0,
                    sabqi: "",
                    sabqiLines: 0,
                    sabqiMistakes: 0,
                    manzil: "",
                    manzilLines: 0,
                    manzilMistakes: 0,
                    attendance: "PRESENT",
                    currentPara: calculatedCurrentPara,
                    currentParaProgress: 0,
                    notes: "",
                    remarks: "",
                  });
                }}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting || !selectedStudent || hifzLoading.progress
                }
                className={`px-6 py-2.5 rounded-md font-medium text-sm flex items-center justify-center min-w-[120px] ${
                  isSubmitting || !selectedStudent || hifzLoading.progress
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700 shadow-sm"
                }`}
              >
                {isSubmitting || hifzLoading.progress ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Daily Progress
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProgressInputForm;
