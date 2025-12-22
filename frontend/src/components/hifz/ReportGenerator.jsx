// src/components/hifz/components/ReportGenerator.jsx
import React from "react";
import { Download, Clock, FileText } from "lucide-react";

const ReportGenerator = ({ handleGenerateReport, hifzLoading }) => {
  return (
    <div className="text-center py-6 sm:py-8 lg:py-12">
      <FileText className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
      <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">
        Report Generation
      </h3>
      <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
        Use the button above to create detailed progress reports.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
        <button
          onClick={handleGenerateReport}
          disabled={hifzLoading.progress}
          className="flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gold text-black rounded-md hover:bg-yellow-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {hifzLoading.progress ? (
            <>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Download PDF Report</span>
              <span className="inline sm:hidden">Download PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReportGenerator;