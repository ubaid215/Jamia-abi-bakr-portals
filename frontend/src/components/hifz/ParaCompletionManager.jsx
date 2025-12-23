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
  
  // 🔥 ADD DEBUG LOGS
  console.log('🔍 ParaCompletionManager Debug:', {
    paraVisualization,
    completionData,
    remainingCount: paraVisualization?.remaining?.length || 0,
    allMemorized: paraVisualization?.allMemorized || [],
    currentPara: paraVisualization?.currentPara
  });

  // Ensure paraVisualization has required properties
  const safeParaVisualization = {
    remaining: paraVisualization?.remaining || [],
    allMemorized: paraVisualization?.allMemorized || [],
    currentPara: paraVisualization?.currentPara || 1,
    completed: paraVisualization?.completed || [],
    alreadyMemorized: paraVisualization?.alreadyMemorized || []
  };

  // Get available paras (remaining + current if it's memorized but should be shown)
  const availableParas = Array.from({ length: 30 }, (_, i) => i + 1)
    .filter(para => !safeParaVisualization.allMemorized.includes(para))
    .sort((a, b) => a - b);

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
                value={completionData.currentPara || safeParaVisualization.currentPara}
                onChange={(e) =>
                  handleCompletionChange("currentPara", parseInt(e.target.value))
                }
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="">Select Para</option>
                {/* Show ALL paras 1-30, but disable already memorized ones */}
                {Array.from({ length: 30 }, (_, i) => {
                  const paraNumber = i + 1;
                  const isMemorized = safeParaVisualization.allMemorized.includes(paraNumber);
                  const isCurrent = paraNumber === safeParaVisualization.currentPara;
                  
                  return (
                    <option 
                      key={paraNumber} 
                      value={paraNumber}
                      disabled={isMemorized}
                      className={isMemorized ? "text-gray-400 bg-gray-100" : ""}
                    >
                      Para {paraNumber} 
                      {isMemorized ? " ✓ Memorized" : ""}
                      {isCurrent ? " (Current)" : ""}
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                {safeParaVisualization.currentPara && 
                  `Currently working on: Para ${safeParaVisualization.currentPara}`}
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Progress (%)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={completionData.currentParaProgress || 0}
                  onChange={(e) =>
                    handleCompletionChange("currentParaProgress", parseInt(e.target.value))
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-16">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={completionData.currentParaProgress || 0}
                    onChange={(e) =>
                      handleCompletionChange("currentParaProgress", parseFloat(e.target.value))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center"
                    placeholder="0-100"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="sm:flex items-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={handleUpdateParaCompletion}
                disabled={!completionData.currentPara || hifzLoading.status}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-md font-medium text-sm sm:text-base ${
                  !completionData.currentPara || hifzLoading.status
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {hifzLoading.status ? 'Updating...' : 'Update Progress'}
              </button>
              {completionData.currentPara && (completionData.currentParaProgress >= 100 || completionData.completedPara) && (
                <button
                  onClick={() => handleMarkParaCompleted(completionData.currentPara)}
                  disabled={hifzLoading.status}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-md font-medium text-sm sm:text-base ${
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

          {/* Progress Bar for Selected Para */}
          {(completionData.currentParaProgress > 0 || completionData.currentPara) && (
            <div className="pt-2 sm:pt-3">
              <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                <span>
                  Progress for Para {completionData.currentPara || safeParaVisualization.currentPara}
                  {completionData.currentPara && 
                    safeParaVisualization.allMemorized.includes(completionData.currentPara) && 
                    " ✓ Already memorized"}
                </span>
                <span>{completionData.currentParaProgress || 0}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${completionData.currentParaProgress || 0}%` }}
                ></div>
              </div>
              {completionData.currentParaProgress === 100 && (
                <div className="mt-2 text-xs text-green-600 font-medium flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                  Ready to mark as completed!
                </div>
              )}
            </div>
          )}

          {/* Current Status Summary */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Current Status:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Memorized:</span>{' '}
                  <span className="font-semibold">
                    {safeParaVisualization.completed.length + safeParaVisualization.alreadyMemorized.length}/30
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Current Para:</span>{' '}
                  <span className="font-semibold">Para {safeParaVisualization.currentPara}</span>
                </div>
                <div>
                  <span className="text-gray-600">Remaining:</span>{' '}
                  <span className="font-semibold">
                    {30 - (safeParaVisualization.completed.length + safeParaVisualization.alreadyMemorized.length)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Completion:</span>{' '}
                  <span className="font-semibold">
                    {(((safeParaVisualization.completed.length + safeParaVisualization.alreadyMemorized.length) / 30) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remaining Paras List */}
      {safeParaVisualization.remaining.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Remaining Paras ({safeParaVisualization.remaining.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {safeParaVisualization.remaining.map((para) => {
              const isSelected = para === completionData.currentPara;
              const isNextPara = para === safeParaVisualization.currentPara;
              
              return (
                <button
                  key={para}
                  onClick={() => {
                    handleCompletionChange("completedPara", null); // Clear completed para
                    handleCompletionChange("currentPara", para);
                    handleCompletionChange("currentParaProgress", 0);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-gold text-white border-gold"
                      : isNextPara
                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  }`}
                  title={isNextPara ? "Current working para" : `Para ${para}`}
                >
                  Para {para}
                  {isNextPara && " (Current)"}
                </button>
              );
            })}
          </div>
          
          {safeParaVisualization.currentPara && 
           !safeParaVisualization.remaining.includes(safeParaVisualization.currentPara) && (
            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-sm text-yellow-800">
                Note: Current para (Para {safeParaVisualization.currentPara}) is already memorized.
                Select the next available para above.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParaCompletionManager;