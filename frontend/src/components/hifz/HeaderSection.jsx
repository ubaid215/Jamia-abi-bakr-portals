// src/components/hifz/components/HeaderSection.jsx
import React from "react";
import { Download } from "lucide-react";

const HeaderSection = ({ reportDays, setReportDays, handleGenerateReport, hifzLoading, selectedStudent }) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 sm:py-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Hifz & Nazra Progress
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Track student progress and generate detailed reports
            </p>
          </div>

          {selectedStudent && (
            <div className="flex items-center justify-start sm:justify-end">
              <div className="flex items-center gap-2">
                <select
                  value={reportDays}
                  onChange={(e) => setReportDays(Number(e.target.value))}
                  disabled={hifzLoading.progress}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="60">Last 60 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
                <button
                  onClick={handleGenerateReport}
                  disabled={hifzLoading.progress}
                  className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gold text-black rounded-md hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {hifzLoading.progress ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5 sm:mr-2 flex-shrink-0"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Generate PDF Report</span>
                      <span className="inline sm:hidden">PDF Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderSection;