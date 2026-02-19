/**
 * Enhanced Hifz Progress Calculation Helper
 * Based on 16-line per page Mushaf (Pakistani Edition)
 */

class HifzCalculationHelper {
  // Accurate Quran Constants for 16-line Mushaf
  static LINES_PER_PAGE = 16;  // 16-line Mushaf
  static TOTAL_PAGES = 604;
  static TOTAL_PARAS = 30;
  static TOTAL_LINES = 9664; // 604 × 16
  static AVG_PAGES_PER_PARA = 20.13; // 604 ÷ 30
  static AVG_LINES_PER_PARA = 322; // 9664 ÷ 30 (more accurate than 320)

  // Para-specific line counts (16-line Mushaf - approximate)
  static PARA_LINE_COUNTS = {
    1: 322, 2: 322, 3: 322, 4: 322, 5: 322,
    6: 322, 7: 322, 8: 322, 9: 322, 10: 322,
    11: 322, 12: 322, 13: 322, 14: 322, 15: 322,
    16: 322, 17: 322, 18: 322, 19: 322, 20: 322,
    21: 322, 22: 322, 23: 322, 24: 322, 25: 322,
    26: 322, 27: 322, 28: 322, 29: 322, 30: 320 // Last para slightly less
  };

  /**
   * Calculate total lines memorized with proper validation
   * @param {Array<number>} alreadyMemorizedParas - Paras memorized before joining
   * @param {Array<number>} completedParas - Paras completed during training
   * @param {number} currentPara - Current Para being memorized
   * @param {number} currentParaProgress - Progress in current Para (0-100%)
   * @returns {Object} Calculation results
   */
  static calculateTotalMemorized(
    alreadyMemorizedParas = [],
    completedParas = [],
    currentPara = 1,
    currentParaProgress = 0
  ) {
    // Remove duplicates and sort
    const uniqueAlreadyMemorized = [...new Set(alreadyMemorizedParas)].sort((a, b) => a - b);
    const uniqueCompleted = [...new Set(completedParas)].sort((a, b) => a - b);

    // Check for overlaps (shouldn't happen, but validate)
    const overlaps = uniqueCompleted.filter(para => 
      uniqueAlreadyMemorized.includes(para)
    );

    if (overlaps.length > 0) {
      console.warn(`Overlapping Paras detected: ${overlaps.join(', ')}`);
    }

    // Calculate lines from already memorized Paras
    const alreadyMemorizedLines = uniqueAlreadyMemorized.reduce(
      (sum, paraNum) => sum + (this.PARA_LINE_COUNTS[paraNum] || this.AVG_LINES_PER_PARA),
      0
    );

    // Calculate lines from completed Paras (excluding overlaps)
    const validCompletedParas = uniqueCompleted.filter(
      para => !uniqueAlreadyMemorized.includes(para)
    );
    
    const completedLines = validCompletedParas.reduce(
      (sum, paraNum) => sum + (this.PARA_LINE_COUNTS[paraNum] || this.AVG_LINES_PER_PARA),
      0
    );

    // Calculate lines from current Para (if not already completed)
    let currentParaLines = 0;
    const isCurrentParaNew = !uniqueAlreadyMemorized.includes(currentPara) && 
                             !uniqueCompleted.includes(currentPara);
    
    if (currentPara && isCurrentParaNew) {
      const paraLines = this.PARA_LINE_COUNTS[currentPara] || this.AVG_LINES_PER_PARA;
      currentParaLines = (paraLines * currentParaProgress) / 100;
    }

    // Total memorized
    const totalMemorizedLines = alreadyMemorizedLines + completedLines + currentParaLines;

    // Calculate total Paras (including partial current Para if > 50%)
    const totalMemorizedParas = uniqueAlreadyMemorized.length + 
                                validCompletedParas.length + 
                                (isCurrentParaNew && currentParaProgress >= 50 ? 0.5 : 0);

    // Remaining calculations
    const remainingLines = this.TOTAL_LINES - totalMemorizedLines;
    const remainingParas = this.TOTAL_PARAS - 
                          uniqueAlreadyMemorized.length - 
                          validCompletedParas.length - 
                          (isCurrentParaNew ? 1 : 0);

    // Completion percentage
    const completionPercentage = (totalMemorizedLines / this.TOTAL_LINES) * 100;

    return {
      alreadyMemorizedLines,
      completedLines,
      currentParaLines: Math.round(currentParaLines),
      totalMemorizedLines: Math.round(totalMemorizedLines),
      remainingLines: Math.round(remainingLines),
      totalMemorizedParas: parseFloat(totalMemorizedParas.toFixed(1)),
      remainingParas: Math.max(0, remainingParas),
      completionPercentage: parseFloat(completionPercentage.toFixed(2)),
      overlaps,
      validCompletedParas,
      breakdown: {
        alreadyMemorized: {
          paras: uniqueAlreadyMemorized,
          count: uniqueAlreadyMemorized.length,
          lines: alreadyMemorizedLines
        },
        completedDuringTraining: {
          paras: validCompletedParas,
          count: validCompletedParas.length,
          lines: completedLines
        },
        currentPara: {
          paraNumber: currentPara,
          progress: currentParaProgress,
          lines: Math.round(currentParaLines),
          isNew: isCurrentParaNew
        }
      }
    };
  }

  /**
   * Validate Para number
   */
  static isValidPara(paraNumber) {
    return Number.isInteger(paraNumber) && paraNumber >= 1 && paraNumber <= 30;
  }

  /**
   * Check if Para is already memorized
   */
  static isParaAlreadyMemorized(paraNumber, alreadyMemorizedParas = []) {
    return alreadyMemorizedParas.includes(paraNumber);
  }

  /**
   * Check if student can work on this Para
   */
  static canWorkOnPara(paraNumber, alreadyMemorizedParas = [], currentPara = 1) {
    // Cannot work on already memorized Paras
    if (alreadyMemorizedParas.includes(paraNumber)) {
      return {
        allowed: false,
        reason: `Para ${paraNumber} was already memorized before joining`
      };
    }

    // Should work sequentially (allow ±1 Para flexibility)
    if (Math.abs(paraNumber - currentPara) > 1) {
      return {
        allowed: false,
        reason: `Should work on Para ${currentPara - 1} to ${currentPara + 1}. Para ${paraNumber} is out of sequence.`
      };
    }

    return { allowed: true };
  }

  /**
   * Estimate completion date
   */
  static estimateCompletion(remainingLines, avgLinesPerDay) {
    if (!avgLinesPerDay || avgLinesPerDay <= 0) {
      return {
        daysRemaining: null,
        estimatedDate: null,
        message: 'Cannot estimate: No daily progress data'
      };
    }

    const daysRemaining = Math.ceil(remainingLines / avgLinesPerDay);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

    // Calculate years, months, weeks
    const yearsRemaining = Math.floor(daysRemaining / 365);
    const monthsRemaining = Math.floor(daysRemaining / 30);
    const weeksRemaining = Math.floor(daysRemaining / 7);

    let timeDescription;
    if (yearsRemaining >= 1) {
      timeDescription = `${yearsRemaining} year${yearsRemaining > 1 ? 's' : ''} ${monthsRemaining % 12} month${monthsRemaining % 12 !== 1 ? 's' : ''}`;
    } else if (monthsRemaining >= 1) {
      timeDescription = `${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''}`;
    } else {
      timeDescription = `${weeksRemaining} week${weeksRemaining !== 1 ? 's' : ''}`;
    }

    return {
      daysRemaining,
      weeksRemaining,
      monthsRemaining,
      yearsRemaining,
      estimatedDate,
      formattedDate: estimatedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      timeDescription,
      message: `Estimated ${timeDescription} (${daysRemaining} days) at current pace`
    };
  }

  /**
   * Calculate lines per day needed to complete by target date
   */
  static calculateRequiredPace(remainingLines, targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    const daysRemaining = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return {
        feasible: false,
        message: 'Target date has passed or is today'
      };
    }

    const requiredLinesPerDay = remainingLines / daysRemaining;

    // Typical daily capacity is 10-20 lines
    const isFeasible = requiredLinesPerDay <= 20;

    return {
      feasible: isFeasible,
      requiredLinesPerDay: parseFloat(requiredLinesPerDay.toFixed(1)),
      daysRemaining,
      difficulty: requiredLinesPerDay <= 10 ? 'Easy' :
                 requiredLinesPerDay <= 15 ? 'Moderate' :
                 requiredLinesPerDay <= 20 ? 'Challenging' : 'Very Difficult',
      message: isFeasible 
        ? `Need to memorize ${requiredLinesPerDay.toFixed(1)} lines per day`
        : `Target requires ${requiredLinesPerDay.toFixed(1)} lines per day - may be too aggressive`
    };
  }

  /**
   * Generate progress report summary
   */
  static generateProgressSummary(calculationResult, avgLinesPerDay = null) {
    const estimation = avgLinesPerDay 
      ? this.estimateCompletion(calculationResult.remainingLines, avgLinesPerDay)
      : null;

    return {
      overall: {
        completionPercentage: `${calculationResult.completionPercentage}%`,
        parasCompleted: `${calculationResult.totalMemorizedParas} / ${this.TOTAL_PARAS}`,
        linesMemorized: `${calculationResult.totalMemorizedLines.toLocaleString()} / ${this.TOTAL_LINES.toLocaleString()}`
      },
      breakdown: {
        beforeJoining: {
          paras: calculationResult.breakdown.alreadyMemorized.paras,
          count: calculationResult.breakdown.alreadyMemorized.count,
          lines: calculationResult.breakdown.alreadyMemorized.lines.toLocaleString()
        },
        duringTraining: {
          paras: calculationResult.breakdown.completedDuringTraining.paras,
          count: calculationResult.breakdown.completedDuringTraining.count,
          lines: calculationResult.breakdown.completedDuringTraining.lines.toLocaleString()
        },
        currentProgress: {
          para: calculationResult.breakdown.currentPara.paraNumber,
          progress: `${calculationResult.breakdown.currentPara.progress}%`,
          lines: calculationResult.breakdown.currentPara.lines
        }
      },
      remaining: {
        paras: calculationResult.remainingParas,
        lines: calculationResult.remainingLines.toLocaleString()
      },
      estimation: estimation || { message: 'Average daily progress not available' },
      warnings: calculationResult.overlaps.length > 0 
        ? [`Overlapping Paras detected: ${calculationResult.overlaps.join(', ')}`]
        : []
    };
  }

  /**
   * Get milestone information
   */
  static getMilestones(totalMemorizedParas) {
    const milestones = [
      { paras: 5, description: 'First 5 Paras - Great Start! 🌟' },
      { paras: 10, description: 'One-Third Complete - Excellent Progress! 🎯' },
      { paras: 15, description: 'Halfway There - Keep Going! 💪' },
      { paras: 20, description: 'Two-Thirds Done - Amazing Dedication! 🌙' },
      { paras: 25, description: 'Almost There - Final Push! 🚀' },
      { paras: 30, description: 'Complete Hifz - MashaAllah! 🎓✨' }
    ];

    const nextMilestone = milestones.find(m => m.paras > totalMemorizedParas);
    const lastAchieved = milestones.filter(m => m.paras <= totalMemorizedParas).pop();

    return {
      lastAchieved,
      nextMilestone,
      parasToNextMilestone: nextMilestone ? nextMilestone.paras - totalMemorizedParas : 0
    };
  }
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HifzCalculationHelper;
}