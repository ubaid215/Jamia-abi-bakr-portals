// src/components/hifz/components/ParaProgressAnalytics.jsx
import React from "react";
import { Calendar, BookOpen, Award, Target, Layers, CheckCircle } from "lucide-react";
import ParaCompletionManager from "./ParaCompletionManager";

const ParaProgressAnalytics = ({
  analytics,
  hifzStatus,
  progressStats,
  paraVisualization,
  completionData,
  handleCompletionChange,
  handleUpdateParaCompletion,
  handleMarkParaCompleted,
  hifzLoading
}) => {
  if (!analytics && !progressStats && !hifzStatus) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">📊</div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No Analytics Data
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No analytics data available for this student.
        </p>
      </div>
    );
  }

  // 🔥 FIX: Get current para from the right source
  const currentPara = hifzStatus?.currentPara || 
                     analytics?.currentPara || 
                     progressStats?.currentPara || 
                     1;

  // Create a complete displayData object
  const displayData = {
    totalSessions: progressStats?.totalSessions || 
                  analytics?.recordCount || 
                  0,
    currentPara: currentPara,
    // Add other stats you need
  };

  // Also ensure paraVisualization has current para
  const enhancedParaVisualization = {
    ...paraVisualization,
    currentPara: paraVisualization?.currentPara || currentPara
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards - UPDATED */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Total Sessions
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {displayData.totalSessions}
              </p>
            </div>
            <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Current Para
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                Para {currentPara}
              </p>
            </div>
            <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Total Memorized
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {enhancedParaVisualization.totalMemorized || 0}/30
              </p>
            </div>
            <Award className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Completion
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {enhancedParaVisualization.completionPercentage?.toFixed(1) || 0}%
              </p>
            </div>
            <Target className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-gold flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Para Progress Visualization - UPDATED */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
          <Layers className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gold" />
          Para Progress Map
        </h3>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress: {enhancedParaVisualization.totalMemorized || 0} of 30 Paras</span>
            <span>{enhancedParaVisualization.completionPercentage?.toFixed(1) || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-gold h-3 rounded-full transition-all duration-500"
              style={{ width: `${enhancedParaVisualization.completionPercentage || 0}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-2">
          {Array.from({ length: 30 }, (_, i) => {
            const paraNumber = i + 1;
            const isCompleted = enhancedParaVisualization.completed?.includes(paraNumber) || false;
            const isAlreadyMemorized = enhancedParaVisualization.alreadyMemorized?.includes(paraNumber) || false;
            const isCurrent = paraNumber === (enhancedParaVisualization.currentPara || 1);
            const isMemorized = enhancedParaVisualization.allMemorized?.includes(paraNumber) || false;
            
            let bgColor = "bg-gray-100";
            let textColor = "text-gray-700";
            let borderColor = "border-gray-300";
            let title = `Para ${paraNumber}`;
            
            if (isAlreadyMemorized) {
              bgColor = "bg-blue-100";
              textColor = "text-blue-700";
              borderColor = "border-blue-300";
              title += " (Already Memorized)";
            } else if (isCompleted) {
              bgColor = "bg-green-100";
              textColor = "text-green-700";
              borderColor = "border-green-300";
              title += " (Completed)";
            } else if (isCurrent) {
              bgColor = "bg-yellow-100";
              textColor = "text-yellow-700";
              borderColor = "border-yellow-300";
              title += " (Current)";
            }
            
            return (
              <div
                key={paraNumber}
                className={`relative p-2 sm:p-3 rounded-lg border ${bgColor} ${borderColor} ${textColor} text-center transition-all hover:scale-105 cursor-pointer`}
                title={title}
                onClick={() => {
                  if (!isMemorized) {
                    handleCompletionChange("completedPara", paraNumber);
                    handleCompletionChange("currentPara", paraNumber);
                    handleCompletionChange("currentParaProgress", 100);
                  }
                }}
              >
                <div className="text-xs sm:text-sm font-bold">{paraNumber}</div>
                <div className="text-xs opacity-75">
                  {isAlreadyMemorized && "✓"}
                  {isCompleted && "✓"}
                  {isCurrent && "●"}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-1"></div>
            <span>Already Memorized</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-1"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-1"></div>
            <span>Remaining</span>
          </div>
        </div>
      </div>

      {/* Para Completion Manager - PASS ENHANCED DATA */}
      <ParaCompletionManager 
        paraVisualization={enhancedParaVisualization}
        completionData={completionData}
        handleCompletionChange={handleCompletionChange}
        handleUpdateParaCompletion={handleUpdateParaCompletion}
        handleMarkParaCompleted={handleMarkParaCompleted}
        hifzLoading={hifzLoading}
      />
    </div>
  );
};

export default ParaProgressAnalytics;