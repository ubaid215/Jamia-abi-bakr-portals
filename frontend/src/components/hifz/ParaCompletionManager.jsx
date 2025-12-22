// src/components/hifz/components/ParaCompletionManager.jsx
import React from "react";
import { CheckCircle } from "lucide-react";

const ParaCompletionManager = ({
  paraVisualization,
  completionData,
  handleCompletionChange,
  handleUpdateParaCompletion,
  handleMarkParaCompleted,
  hifzLoading
}) => {
  return (
    <div className="space-y-4">
      {/* Para Completion Update */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          Update Para Completion
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Current Para
              </label>
              <select
                value={completionData.currentPara}
                onChange={(e) =>
                  handleCompletionChange("currentPara", parseInt(e.target.value))
                }
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="">Select Para</option>
                {paraVisualization.remaining.map((para) => (
                  <option key={para} value={para}>
                    Para {para}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Progress (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={completionData.currentParaProgress}
                onChange={(e) =>
                  handleCompletionChange("currentParaProgress", parseFloat(e.target.value))
                }
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                placeholder="0-100"
              />
            </div>
            <div className="sm:flex items-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={handleUpdateParaCompletion}
                disabled={!completionData.currentPara || hifzLoading.status}
                className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base ${
                  !completionData.currentPara || hifzLoading.status
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {hifzLoading.status ? 'Updating...' : 'Update Progress'}
              </button>
              {completionData.currentPara && completionData.currentParaProgress >= 100 && (
                <button
                  onClick={() => handleMarkParaCompleted(completionData.currentPara)}
                  disabled={hifzLoading.status}
                  className={`w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium text-sm sm:text-base ${
                    hifzLoading.status
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Mark Complete
                </button>
              )}
            </div>
          </div>

          {completionData.currentParaProgress > 0 && (
            <div className="pt-2 sm:pt-3">
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                <span>Progress for Para {completionData.currentPara}</span>
                <span>{completionData.currentParaProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${completionData.currentParaProgress}%` }}
                ></div>
              </div>
              {completionData.currentParaProgress === 100 && (
                <div className="mt-2 text-xs text-green-600 font-medium">
                  <CheckCircle className="inline h-3 w-3 mr-1" />
                  Ready to mark as completed!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Remaining Paras List */}
      {paraVisualization.remaining.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Remaining Paras ({paraVisualization.remaining.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {paraVisualization.remaining.map((para) => (
              <button
                key={para}
                onClick={() => {
                  handleCompletionChange("completedPara", para);
                  handleCompletionChange("currentPara", para);
                  handleCompletionChange("currentParaProgress", 0);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  para === completionData.currentPara
                    ? "bg-gold text-white border-gold"
                    : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                }`}
              >
                Para {para}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParaCompletionManager;