/**
 * Performance Intelligence Engine
 * 
 * Transforms complex power analysis into intuitive, actionable insights.
 * The bridge between scientific calculations and user-friendly recommendations.
 * 
 * Core Philosophy: "What does this data mean for me and what should I do next?"
 */

import { 
  calculatePowerRatios,
  calculateEnergySystemContributions,
  calculateCriticalPower,
  calculatePowerDecayRates,
  calculateTrainingZones,
  generateObjectiveTrainingFocus
} from './powerAnalysis'
import { PowerAnalysisUtils } from './powerAnalysisUtils'
import { PowerCalculations } from './powerCalculations'
import { PowerFormatting } from './powerFormatting'

export const PerformanceIntelligence = {
  
  /**
   * Generate main performance summary - the "at-a-glance" overview
   * Returns: "Here's where you are and what you should focus on"
   */
  generatePerformanceSummary(riderData, recentEvents = []) {
    const powerProfile = PowerAnalysisUtils.convertPowerDataForAnalysis(riderData)
    const powerRatios = calculatePowerRatios(powerProfile)
    const energySystems = calculateEnergySystemContributions(powerProfile)
    const criticalPower = calculateCriticalPower(powerProfile)
    const decayRates = calculatePowerDecayRates(powerProfile)
    const ftp = riderData.ftp || powerProfile.find(p => p.duration === 1200)?.power || 0
    
    // Current form assessment
    const formState = this.assessCurrentForm(riderData, recentEvents)
    
    // Identify primary focus areas
    const focusAreas = this.identifyObjectiveFocusAreas(powerRatios, energySystems, criticalPower, powerProfile, decayRates)
    
    // Category progression analysis
    const categoryStatus = this.analyzeCategoryProgression(riderData)
    
    return {
      // Main insights - what the rider needs to know RIGHT NOW
      primaryInsight: this.generatePrimaryInsight(formState, focusAreas, categoryStatus),
      
      // Current status
      formState,
      categoryStatus,
      
      // What to work on
      focusAreas: focusAreas.slice(0, 3), // Top 3 priorities
      
      // Power profile strengths
      strengths: this.identifyObjectiveStrengths(powerRatios, energySystems, powerProfile),
      
      // Quick wins available
      quickWins: this.identifyQuickWins(powerProfile, categoryStatus),
      
      // Raw power ratios for display
      powerRatios
    }
  },

  /**
   * Assess current form state using recent performance data
   */
  assessCurrentForm(riderData, recentEvents) {
    const powerProfile = PowerAnalysisUtils.convertPowerDataForAnalysis(riderData)
    
    // Compare recent power to season bests
    const recentDecline = this.calculateRecentDecline(powerProfile)
    const trainingLoad = this.estimateTrainingLoad(recentEvents)
    
    let state, description, recommendation
    
    if (recentDecline < 5 && trainingLoad === 'optimal') {
      state = 'excellent'
      description = 'You\'re on fire! Recent performances match or exceed your seasonal bests'
      recommendation = 'Perfect time for key races or pushing for new personal bests'
    } else if (recentDecline < 10 && trainingLoad === 'high') {
      state = 'building'
      description = 'Power is strong and training load is productive - you\'re building fitness'
      recommendation = 'Maintain current training, plan recovery week in 2-3 weeks'
    } else if (recentDecline > 15 && trainingLoad === 'high') {
      state = 'overreaching'
      description = 'Power down despite high training load - possible overreaching detected'
      recommendation = 'Reduce training intensity 20-30% for 7-10 days, focus on recovery'
    } else if (recentDecline > 10 && trainingLoad === 'low') {
      state = 'detraining'
      description = 'Power declining with reduced training - natural fitness loss'
      recommendation = 'Gradually increase training volume, focus on base building'
    } else {
      state = 'stable'
      description = 'Power levels consistent with seasonal pattern'
      recommendation = 'Good foundation - ready to target specific improvements'
    }
    
    return {
      state,
      description,
      recommendation,
      recentDecline: `${recentDecline.toFixed(1)}%`,
      trainingLoad,
      confidence: recentEvents.length >= 5 ? 'high' : 'moderate'
    }
  },

  /**
   * Generate the main insight - the "headline" of their performance analysis
   */
  generatePrimaryInsight(formState, focusAreas, categoryStatus) {
    const insights = []
    
    // Form-based insights
    if (formState.state === 'excellent') {
      insights.push({
        type: 'opportunity',
        message: '🔥 You\'re in peak form - perfect time for breakthrough performances!',
        action: 'Target your goal races or push for category promotion'
      })
    } else if (formState.state === 'overreaching') {
      insights.push({
        type: 'warning',
        message: '⚠️ Your body needs recovery - power down despite high training',
        action: 'Take 7-10 easier days to bounce back stronger'
      })
    }
    
    // Category progression insights
    if (categoryStatus.promotionPotential === 'high') {
      insights.push({
        type: 'goal',
        message: `🎯 Category ${categoryStatus.next} is within reach - just +${categoryStatus.powerGap}W needed!`,
        action: `Focus on ${focusAreas[0]?.area || 'threshold power'} development`
      })
    }
    
    // Focus area insights
    if (focusAreas[0]?.impact === 'high') {
      insights.push({
        type: 'development',
        message: `💪 Your ${focusAreas[0].area} has huge development potential`,
        action: `${focusAreas[0].improvementPotential}% gains possible with targeted training`
      })
    }
    
    // Return the most relevant insight
    return insights[0] || {
      type: 'stable',
      message: '📊 Solid foundation established - ready to target specific improvements',
      action: 'Choose your primary focus area for the next training block'
    }
  },

  /**
   * Identify objective focus areas for development based on power data analysis
   */
  identifyObjectiveFocusAreas(powerRatios, energySystems, criticalPower, powerProfile, decayRates) {
    const areas = []
    
    // Get objective training focus from power analysis
    const trainingFocus = generateObjectiveTrainingFocus(powerProfile, decayRates, criticalPower)
    
    // Convert to interface format expected by components
    trainingFocus.forEach((focus, index) => {
      areas.push({
        area: focus.duration,
        system: focus.system,
        impact: parseFloat(focus.improvementPotential || '0') > 20 ? 'high' : 
                parseFloat(focus.improvementPotential || '0') > 10 ? 'medium' : 'low',
        improvementPotential: parseFloat(focus.improvementPotential || '0'),
        description: `${focus.system} development for ${focus.duration} efforts`,
        trainingFocus: focus.trainingMethods?.[0] || 'Targeted interval training',
        expectedGains: focus.expectedAdaptations?.[0] || 'Performance improvement',
        currentMetric: focus.currentDecay || focus.currentRatio || focus.cpDiscrepancy || 'Analysis available',
        researchBasis: focus.researchBasis
      })
    })
    
    // Add power ratio analysis for additional context
    if (powerRatios) {
      // Sprint power analysis
      if (powerRatios.sprintRatio.value < 2.2) {
        areas.push({
          area: '15s Sprint Power',
          system: 'Neuromuscular Development',
          impact: 'medium',
          improvementPotential: Math.min(25, (2.5 - powerRatios.sprintRatio.value) * 15),
          description: `Current 15s:20min ratio is ${powerRatios.sprintRatio.value}`,
          trainingFocus: 'Short maximum intensity intervals',
          expectedGains: 'Explosive power development',
          currentMetric: `${powerRatios.sprintRatio.value} ratio`,
          researchBasis: 'Power profiling analysis'
        })
      }
      
      // VO2max power analysis
      if (powerRatios.vo2maxRatio.value < 1.15) {
        areas.push({
          area: '5min VO2max Power',
          system: 'Aerobic Power Development', 
          impact: 'high',
          improvementPotential: Math.min(20, (1.2 - powerRatios.vo2maxRatio.value) * 25),
          description: `Current 5min:20min ratio is ${powerRatios.vo2maxRatio.value}`,
          trainingFocus: '3-8 minute high-intensity intervals',
          expectedGains: 'VO2max and lactate threshold improvements',
          currentMetric: `${powerRatios.vo2maxRatio.value} ratio`,
          researchBasis: 'Aerobic power analysis'
        })
      }
    }
    
    // Sort by impact and improvement potential
    return areas.sort((a, b) => {
      const impactWeight = { 'high': 3, 'medium': 2, 'low': 1 }
      const scoreA = impactWeight[a.impact] * a.improvementPotential
      const scoreB = impactWeight[b.impact] * b.improvementPotential
      return scoreB - scoreA
    })
  },

  /**
   * Identify objective strengths based on power data analysis
   */
  identifyObjectiveStrengths(powerRatios, energySystems, powerProfile) {
    const strengths = []
    
    if (powerRatios) {
      // High sprint ratio indicates strong neuromuscular power
      if (powerRatios.sprintRatio.value >= 2.8) {
        strengths.push({
          area: 'Neuromuscular Power',
          description: `Strong 15s:20min power ratio (${powerRatios.sprintRatio.value})`,
          leverage: `Excellent for short explosive efforts and final sprints`,
          metric: `${powerRatios.sprintRatio.value}:1 ratio`
        })
      }
      
      // High VO2max ratio indicates strong aerobic power
      if (powerRatios.vo2maxRatio.value >= 1.20) {
        strengths.push({
          area: 'VO2max Power',
          description: `Strong 5min:20min power ratio (${powerRatios.vo2maxRatio.value})`,
          leverage: `Excellent for 3-8 minute efforts and climbing`,
          metric: `${powerRatios.vo2maxRatio.value}:1 ratio`
        })
      }
      
      // High sustainability indicates strong aerobic base
      if (powerRatios.sustainability.mediumToLong >= 0.88) {
        strengths.push({
          area: 'Power Sustainability',
          description: `Strong power sustainability profile (${(powerRatios.sustainability.mediumToLong * 100).toFixed(1)}%)`,
          leverage: `Excellent for time trials and long sustained efforts`,
          metric: `${(powerRatios.sustainability.mediumToLong * 100).toFixed(1)}% sustainability`
        })
      }
      
      // High endurance ratio (if available)
      if (powerRatios.enduranceRatio && powerRatios.enduranceRatio.value >= 0.90) {
        strengths.push({
          area: 'Endurance Power',
          description: `Exceptional endurance power ratio (${powerRatios.enduranceRatio.value})`,
          leverage: `Outstanding for long events and multi-stage races`,
          metric: `${powerRatios.enduranceRatio.value}:1 ratio`
        })
      }
    }
    
    // Add energy system strengths
    if (energySystems.phosphocreatine && energySystems.phosphocreatine.peakPower > 600) {
      strengths.push({
        area: 'Peak Power Output',
        description: `High peak neuromuscular power (${energySystems.phosphocreatine.peakPower}W)`,
        leverage: `Use for decisive attacks and sprint finishes`,
        metric: `${energySystems.phosphocreatine.peakPower}W peak`
      })
    }
    
    return strengths
  },

  /**
   * Identify quick wins and low-hanging fruit
   */
  identifyQuickWins(powerProfile, categoryStatus) {
    const quickWins = []
    
    // Category promotion quick wins
    if (categoryStatus.promotionPotential === 'high') {
      quickWins.push({
        type: 'Category Promotion',
        timeframe: '6-12 weeks',
        description: `Just ${categoryStatus.powerGap}W from Category ${categoryStatus.next}`,
        action: 'Focus training on threshold power development',
        expectedResult: 'Category upgrade with focused 2-month training block'
      })
    }
    
    // Training consistency quick wins
    quickWins.push({
      type: 'Training Consistency',
      timeframe: '2-4 weeks',
      description: 'Small, consistent improvements compound quickly',
      action: 'Establish regular training schedule with progressive overload',
      expectedResult: '5-8% power improvement in first month'
    })
    
    // Recovery optimization
    quickWins.push({
      type: 'Recovery Optimization',
      timeframe: '1-2 weeks',
      description: 'Better recovery = higher quality training',
      action: 'Optimize sleep, nutrition, and stress management',
      expectedResult: 'Improved training adaptation and reduced fatigue'
    })
    
    return quickWins
  },

  /**
   * Generate personalized workout recommendations
   */
  generatePersonalizedWorkouts(riderData, focusArea, trainingPhase = 'build') {
    const ftp = riderData.ftp || 250 // Default FTP
    const workouts = []
    
    if (focusArea.area === 'Sprint Power') {
      workouts.push({
        name: 'Sprint Power Development',
        type: 'Neuromuscular',
        duration: '60 minutes',
        structure: [
          { phase: 'Warm-up', duration: '15 min', intensity: 'Zone 1-2', description: 'Easy spinning' },
          { phase: 'Prep', duration: '3 x 30s', intensity: '90% effort', description: 'Build to sprint pace' },
          { phase: 'Main Set', duration: '8 x 15s', intensity: 'All-out', description: 'Maximum sprint power' },
          { phase: 'Recovery', duration: '5 min', intensity: 'Zone 1', description: 'Between each sprint' },
          { phase: 'Cool-down', duration: '10 min', intensity: 'Zone 1', description: 'Easy spinning' }
        ],
        targetAdaptations: ['PCr system development', 'Motor unit recruitment', 'Peak power gains'],
        frequency: '2-3x per week',
        progression: 'Increase to 10 x 15s after 3 weeks'
      })
    } else if (focusArea.area === 'Attack Power') {
      workouts.push({
        name: 'VO2max Attack Intervals',
        type: 'Anaerobic Capacity',
        duration: '75 minutes',
        structure: [
          { phase: 'Warm-up', duration: '20 min', intensity: 'Zone 1-2', description: 'Progressive build' },
          { phase: 'Main Set', duration: '5 x 3 min', intensity: `${Math.round(ftp * 1.15)}W (115% FTP)`, description: 'Hard interval effort' },
          { phase: 'Recovery', duration: '3 min', intensity: 'Zone 1', description: 'Easy spinning between' },
          { phase: 'Cool-down', duration: '15 min', intensity: 'Zone 1', description: 'Easy spinning' }
        ],
        targetAdaptations: ['VO2max increase', 'Lactate buffering', 'Anaerobic power'],
        frequency: '2x per week',
        progression: 'Increase to 6 x 3 min after 2 weeks'
      })
    } else if (focusArea.area === 'Threshold Power') {
      workouts.push({
        name: 'Sweet Spot Threshold Build',
        type: 'Aerobic Power',
        duration: '90 minutes',
        structure: [
          { phase: 'Warm-up', duration: '20 min', intensity: 'Zone 1-2', description: 'Progressive build' },
          { phase: 'Main Set', duration: '3 x 15 min', intensity: `${Math.round(ftp * 0.9)}W (90% FTP)`, description: 'Sweet spot effort' },
          { phase: 'Recovery', duration: '5 min', intensity: 'Zone 1', description: 'Easy spinning between' },
          { phase: 'Cool-down', duration: '15 min', intensity: 'Zone 1', description: 'Easy spinning' }
        ],
        targetAdaptations: ['FTP improvement', 'Mitochondrial density', 'Fat oxidation'],
        frequency: '2-3x per week',
        progression: 'Build to 2 x 20 min @ 95% FTP over 4 weeks'
      })
    }
    
    return workouts
  },

  // Helper methods for objective analysis
  calculateRecentDecline(powerProfile) {
    // Compare recent power to seasonal bests
    const recentPowers = powerProfile.filter(p => p.recent).map(p => p.recent / p.season)
    if (recentPowers.length === 0) return 0
    
    const averageDecline = recentPowers.reduce((sum, ratio) => sum + (1 - ratio), 0) / recentPowers.length
    return averageDecline * 100
  },

  estimateTrainingLoad(recentEvents) {
    if (recentEvents.length < 3) return 'insufficient_data'
    
    const weeklyEvents = recentEvents.length / 4 // Assume 4-week period
    
    if (weeklyEvents >= 4) return 'high'
    if (weeklyEvents >= 2) return 'optimal'
    if (weeklyEvents >= 1) return 'moderate'
    return 'low'
  },

  analyzeCategoryProgression(riderData) {
    const ftp = riderData.profile?.ftp || riderData.ftp || 0
    const weight = riderData.profile?.weight || riderData.weight || 75
    const currentCategory = riderData.profile?.category || riderData.category || PowerCalculations.determineCategory(ftp, weight)
    
    console.log('📊 Category Progression Analysis:', {
      ftp,
      weight,
      currentCategory,
      calculatedWkg: PowerCalculations.calculateWkg(ftp, weight),
      riderDataKeys: Object.keys(riderData)
    })
    
    const categoryGap = PowerCalculations.calculateCategoryGap(ftp, weight, currentCategory)
    
    if (!categoryGap) {
      return { promotionPotential: 'none', current: currentCategory }
    }
    
    const promotionPotential = categoryGap.powerGap < (ftp * 0.1) ? 'high' : 
                               categoryGap.powerGap < (ftp * 0.2) ? 'medium' : 'low'
    
    return {
      current: currentCategory,
      next: categoryGap.nextCategory,
      powerGap: categoryGap.powerGap,
      promotionPotential,
      timeframe: promotionPotential === 'high' ? '2-3 months' : 
                promotionPotential === 'medium' ? '4-6 months' : '6-12 months'
    }
  }
}

export default PerformanceIntelligence
