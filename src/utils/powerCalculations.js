/**
 * Power Calculation Utilities
 * Centralized calculation functions to eliminate inline math
 */

export const PowerCalculations = {
  // Calculate power-to-weight ratio
  calculateWkg(power, weight) {
    if (!power || !weight) return null
    return power / weight
  },

  // Calculate percentage change between values
  calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  },

  // Calculate power ratio between two durations
  calculatePowerRatio(power1, power2) {
    if (!power1 || !power2 || power2 === 0) return null
    return power1 / power2
  },

  // Estimate power based on research-validated duration multipliers
  // Based on Monod & Scherrer model and updated with Leo & Coggan (2023) data
  estimatePowerForDuration(avgPower, duration) {
    const multipliers = {
      1: 2.2,    // 1s - peak neuromuscular power
      5: 2.0,    // 5s - phosphocreatine system
      15: 1.8,   // 15s - mixed alactic/lactic
      30: 1.6,   // 30s - anaerobic capacity
      60: 1.4,   // 1min - VO2max power
      90: 1.3,   // 90s - severe domain
      120: 1.25, // 2min - severe domain
      180: 1.2,  // 3min - VO2max plateau
      300: 1.15, // 5min - VO2max
      600: 1.08, // 10min - above threshold
      900: 1.05, // 15min - threshold
      1200: 1.0, // 20min - FTP baseline
      1800: 0.97, // 30min - tempo
      2400: 0.95, // 40min - tempo
      3600: 0.92, // 1hr - endurance
      5400: 0.88  // 90min - long endurance
    }
    
    const multiplier = multipliers[duration] || 1.0
    return Math.round(avgPower * multiplier)
  },

  // Calculate category based on power and weight (CORRECTED 2024 ZwiftPower standards)
  determineCategory(ftp, weight) {
    const wkg = this.calculateWkg(ftp, weight)
    if (!wkg) return 'Unknown'
    
    // FIXED: Correct ZwiftPower category boundaries (2024)
    // A+: 5.0+ W/kg, A: 4.0-4.9 W/kg, B: 3.2-3.9 W/kg, C: 2.5-3.1 W/kg, D: <2.5 W/kg
    if (wkg >= 5.0) return 'A+'
    if (wkg >= 4.0) return 'A'
    if (wkg >= 3.2) return 'B' 
    if (wkg >= 2.5) return 'C'
    return 'D' // Removed E category - ZwiftPower uses D as lowest
  },

  // Calculate category thresholds for progression (CORRECTED 2024 standards)
  getCategoryThresholds(weight) {
    return {
      'D': { minWkg: 0, maxWkg: 2.5, minWatts: 0, maxWatts: Math.round(2.5 * weight) },
      'C': { minWkg: 2.5, maxWkg: 3.2, minWatts: Math.round(2.5 * weight), maxWatts: Math.round(3.2 * weight) },
      'B': { minWkg: 3.2, maxWkg: 4.0, minWatts: Math.round(3.2 * weight), maxWatts: Math.round(4.0 * weight) },
      'A': { minWkg: 4.0, maxWkg: 5.0, minWatts: Math.round(4.0 * weight), maxWatts: Math.round(5.0 * weight) },
      'A+': { minWkg: 5.0, maxWkg: Infinity, minWatts: Math.round(5.0 * weight), maxWatts: Infinity }
    }
  },

  // Calculate power gap to next category (CORRECTED for accurate categories)
  calculateCategoryGap(currentFtp, weight, currentCategory) {
    const thresholds = this.getCategoryThresholds(weight)
    const nextCat = { 'D': 'C', 'C': 'B', 'B': 'A', 'A': 'A+' }[currentCategory]
    
    if (!nextCat || nextCat === 'A+') {
      // Already at top category
      if (currentCategory === 'A') {
        const aPlusThreshold = thresholds['A+'].minWatts
        if (currentFtp >= aPlusThreshold) {
          return {
            nextCategory: 'A+',
            powerGap: 0,
            percentageGap: 0,
            message: 'Elite A+ category achieved!'
          }
        } else {
          return {
            nextCategory: 'A+',
            powerGap: aPlusThreshold - currentFtp,
            percentageGap: this.calculatePercentageChange(aPlusThreshold, currentFtp)
          }
        }
      }
      return null
    }
    
    const requiredWatts = thresholds[nextCat].minWatts
    const gap = Math.max(0, requiredWatts - currentFtp)
    
    return {
      nextCategory: nextCat,
      powerGap: gap,
      percentageGap: gap > 0 ? this.calculatePercentageChange(requiredWatts, currentFtp) : 0
    }
  },

  // Clamp power values within realistic ranges
  clampPower(power, minPower, maxPower) {
    return Math.max(minPower, Math.min(maxPower, power))
  }
}

export default PowerCalculations
