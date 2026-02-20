import React from "react";
import { Calendar, BookOpen, Award, Target, Layers, CheckCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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

  // Get current para from the right source
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
  };

  // Ensure paraVisualization has current para
  const enhancedParaVisualization = {
    ...paraVisualization,
    currentPara: paraVisualization?.currentPara || currentPara
  };

  // Data for Doughnut Chart
  const completionPercentage = enhancedParaVisualization.completionPercentage || 0;
  const chartData = [
    { name: 'Completed', value: completionPercentage },
    { name: 'Remaining', value: 100 - completionPercentage }
  ];
  const COLORS = ['#10B981', '#E5E7EB']; // Green and Gray

  return (
    <div className="space-y-6">
      {/* Top Section: Charts & Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Chart Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-500 absolute top-4 left-4">Overall Completion</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
              <span className="text-3xl font-bold text-gray-800">{completionPercentage.toFixed(0)}%</span>
              <span className="text-xs text-gray-500">Completed</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Para</p>
                <h4 className="text-2xl font-bold text-gray-800 mt-1">Para {currentPara}</h4>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <BookOpen size={20} />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${hifzStatus?.currentParaProgress || 0}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-right">{hifzStatus?.currentParaProgress || 0}% ongoing</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Memorized</p>
                <h4 className="text-2xl font-bold text-gray-800 mt-1">{enhancedParaVisualization.totalMemorized || 0} <span className="text-sm text-gray-400 font-normal">/ 30</span></h4>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Award size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-auto">Paras fully completed</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Sessions</p>
                <h4 className="text-2xl font-bold text-gray-800 mt-1">{displayData.totalSessions}</h4>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <Calendar size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-auto">Days present</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Next Milestone</p>
                <h4 className="text-2xl font-bold text-gray-800 mt-1">
                  {enhancedParaVisualization.totalMemorized < 5 ? '5 Paras' :
                    enhancedParaVisualization.totalMemorized < 10 ? '10 Paras' :
                      enhancedParaVisualization.totalMemorized < 15 ? 'Half Quran' : 'Hafiz'}
                </h4>
              </div>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <Target size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-auto">Keep going!</p>
          </div>
        </div>
      </div>

      {/* Detailed Para Map */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-indigo-500" size={20} />
            Memorization Map
          </h3>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Completed</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Memorized</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Current</div>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
          {Array.from({ length: 30 }, (_, i) => {
            const paraNumber = i + 1;
            const isCompleted = enhancedParaVisualization.completed?.includes(paraNumber) || false;
            const isAlreadyMemorized = enhancedParaVisualization.alreadyMemorized?.includes(paraNumber) || false;
            const isCurrent = paraNumber === (enhancedParaVisualization.currentPara || 1);
            const isMemorized = enhancedParaVisualization.allMemorized?.includes(paraNumber) || false;

            let statusClass = "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100";
            let statusIcon = null;

            if (isAlreadyMemorized) {
              statusClass = "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 font-medium";
              statusIcon = "✓";
            } else if (isCompleted) {
              statusClass = "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 font-medium shadow-sm";
              statusIcon = "✓";
            } else if (isCurrent) {
              statusClass = "bg-yellow-50 text-yellow-700 border-yellow-300 ring-2 ring-yellow-100 ring-offset-1 font-bold shadow-md transform scale-105";
              statusIcon = "●";
            }

            return (
              <div
                key={paraNumber}
                onClick={() => {
                  if (!isMemorized) {
                    handleCompletionChange("completedPara", paraNumber);
                    handleCompletionChange("currentPara", paraNumber);
                    handleCompletionChange("currentParaProgress", 100);
                  }
                }}
                className={`
                    relative aspect-square flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer
                    ${statusClass}
                `}
              >
                <span className="text-xs opacity-60">Para</span>
                <span className="text-lg">{paraNumber}</span>
                {statusIcon && <span className="absolute top-1 right-1 text-[10px]">{statusIcon}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Para Completion Manager */}
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