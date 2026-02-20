/* eslint-disable no-unused-vars */
// src/components/hifz/utils/paraCalculations.js

export const PARA_NAMES = [
  "1. Alif Lam Meem", "2. Sayaqul", "3. Tilkal Rusull", "4. Lan Tana Loo", "5. Wal Mohsanat",
  "6. La Yuhibbullah", "7. Wa Iza Samiu", "8. Wa Lau Annana", "9. Qalal Malao", "10. Wa A'lamu",
  "11. Yatazeroona", "12. Wa Mamin Da'abat", "13. Wa Ma Ubrioo", "14. Rubama", "15. Subhanallazi",
  "16. Qala Alam", "17. Iqtaraba", "18. Qadd Aflaha", "19. Wa Qalallazina", "20. A'man Khalaqa",
  "21. Utlu Ma Oohi", "22. Wa Mannyaqnut", "23. Wa Maliya", "24. Faman Azlam", "25. Elahe Yuruddo",
  "26. Ha'a Meem", "27. Qala Fama Khatbukum", "28. Qadd Sami Allah", "29. Tabarakallazi", "30. Amma Yatasa'aloon"
];

export const calculateParaLogic = {
  // Get the next para based on completed paras
  getNextPara: (completedParas = [], alreadyMemorizedParas = [], currentPara = 1) => {
    const allMemorized = [...new Set([...alreadyMemorizedParas, ...completedParas])];

    // Find the first gap in paras
    for (let i = 1; i <= 30; i++) {
      if (!allMemorized.includes(i)) {
        return i;
      }
    }

    // If all paras are completed, return 31 (completed Quran)
    return 31;
  },

  // Check if a para can be worked on
  canWorkOnPara: (para, completedParas = [], alreadyMemorizedParas = []) => {
    const allMemorized = [...new Set([...alreadyMemorizedParas, ...completedParas])];

    // Para must be between 1 and 30
    if (para < 1 || para > 30) {
      return { allowed: false, reason: "Para must be between 1 and 30" };
    }

    // Cannot work on already memorized para
    if (allMemorized.includes(para)) {
      return { allowed: false, reason: `Para ${para} is already memorized` };
    }

    return { allowed: true, reason: "" };
  },

  // Calculate progress percentage
  calculateProgressPercentage: (completedParas = [], alreadyMemorizedParas = []) => {
    const allMemorized = [...new Set([...alreadyMemorizedParas, ...completedParas])];
    const uniqueMemorized = allMemorized.filter(p => p >= 1 && p <= 30);
    return (uniqueMemorized.length / 30) * 100;
  },

  // Get remaining paras
  getRemainingParas: (completedParas = [], alreadyMemorizedParas = []) => {
    const allMemorized = [...new Set([...alreadyMemorizedParas, ...completedParas])];
    const remaining = [];

    for (let i = 1; i <= 30; i++) {
      if (!allMemorized.includes(i)) {
        remaining.push(i);
      }
    }

    return remaining;
  },

  // Validate para completion
  validateParaCompletion: (completedPara, currentPara, completedParas = [], alreadyMemorizedParas = []) => {
    if (completedPara < 1 || completedPara > 30) {
      return { valid: false, error: "Para number must be between 1 and 30" };
    }

    const allMemorized = [...new Set([...alreadyMemorizedParas, ...completedParas])];

    if (allMemorized.includes(completedPara)) {
      return { valid: false, error: `Para ${completedPara} is already memorized` };
    }

    if (completedPara !== currentPara) {
      return { valid: false, error: `You must complete Para ${currentPara} before Para ${completedPara}` };
    }

    return { valid: true, error: "" };
  },

  // Calculate data flow for analytics
  calculateProgressStats: (analytics, hifzStatus, calculatedCurrentPara) => {
    if (!analytics && !hifzStatus) return null;

    return {
      totalSessions: analytics?.period?.totalDays || 0,
      totalSabaq: analytics?.lines?.totalSabaqLines || 0,
      totalSabqi: analytics?.lines?.totalSabqiLines || 0,
      totalMistakes: analytics?.performance?.totalMistakes || 0,
      currentPara: analytics?.paraProgress?.currentPara || calculatedCurrentPara,
      avgLinesPerDay: analytics?.lines?.avgLinesPerDay || 0,
      completedParas: analytics?.paraProgress?.completedParas || hifzStatus?.completedParas?.length || 0,
      alreadyMemorized: hifzStatus?.alreadyMemorizedParas?.length || 0,
      totalMemorized: (hifzStatus?.completedParas?.length || 0) + (hifzStatus?.alreadyMemorizedParas?.length || 0),
      completionPercentage: calculateParaLogic.calculateProgressPercentage(
        hifzStatus?.completedParas || [],
        hifzStatus?.alreadyMemorizedParas || []
      ),
    };
  },

  // Get para visualization data
  getParaVisualization: (hifzStatus, calculatedCurrentPara) => {
    const completed = hifzStatus?.completedParas || [];
    const alreadyMemorized = hifzStatus?.alreadyMemorizedParas || [];
    const allMemorized = [...new Set([...alreadyMemorized, ...completed])];

    // 🔥 FIX: Get ALL paras, not just remaining
    const allParas = Array.from({ length: 30 }, (_, i) => i + 1);

    // Calculate remaining (non-memorized) paras
    const remaining = allParas.filter(para => !allMemorized.includes(para));

    return {
      completed,
      alreadyMemorized,
      allMemorized,
      remaining,
      // 🔥 ADD: All paras for dropdown
      allParas,
      currentPara: calculatedCurrentPara,
      totalMemorized: allMemorized.length,
      completionPercentage: (allMemorized.length / 30) * 100
    };
  },
};