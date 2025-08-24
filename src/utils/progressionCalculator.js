/**
 * Power Progression Logic
 * Complex progression calculation extracted from PowerProgressionChart
 */

import { PowerAnalysisUtils } from './powerAnalysisUtils'
import { EventUtils } from './eventUtils'
import { PowerFormatting } from './powerFormatting'

export const ProgressionCalculator = {
  // Main progression calculation function
  calculateProgression(eventData, powerData, dayFilter, selectedEventType) {
    // Reduced debug output - only show key metrics
    console.log('📈 PowerProgressionChart Analysis:', {
      selectedEventType,
      dayFilter,
      totalEvents: eventData?.events?.length
    })

    try {
      // Use provided events
      let eventsToUse = [...eventData.events]
      
      // Filter out events with invalid dates BEFORE sorting
      const eventsWithValidDates = eventsToUse.filter(event => {
        const hasValidDate = event.event_date && !isNaN(new Date(event.event_date).getTime())
        return hasValidDate
      })

      // Get events sorted by date
      const sortedEvents = eventsWithValidDates.sort((a, b) => 
        new Date(a.event_date) - new Date(b.event_date)
      )

      // Get standard intervals
      const keyIntervals = PowerAnalysisUtils.getStandardIntervals().slice(0, 5) // First 5 intervals
      
      // Transform each event into a data point
      const eventDataPoints = sortedEvents.map((event, index) => {
        const eventDate = new Date(event.event_date)
        const today = new Date()
        const daysAgo = Math.round((today - eventDate) / (1000 * 60 * 60 * 24))
        
        const dataPoint = {
          event_date: event.event_date,
          date: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateLabel: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
          daysAgo,
          duration: event.duration_seconds || event.duration || null,
          originalEvent: event
        }

        // UNIFIED TIMELINE APPROACH: Ensure all intervals have values for all events
        keyIntervals.forEach(interval => {
          // PRIORITY 1: Use actual event power data if available
          if (event[interval.key] && event[interval.key] > 0) {
            dataPoint[interval.key] = event[interval.key]
          } 
          // PRIORITY 2: Check if this event matches when power peaks were achieved
          else {
            const powerResult = PowerAnalysisUtils.getPowerForEvent(event, interval.key, powerData)
            if (powerResult) {
              dataPoint[interval.key] = powerResult.power
            } else if (event.avg_power && powerData?.[interval.key]) {
              // INTELLIGENT ESTIMATION: Create progression by estimating based on avgPower
              const estimatedPower = this.estimateIntelligentPower(event, interval, powerData)
              dataPoint[interval.key] = estimatedPower
            } else {
              dataPoint[interval.key] = null
            }
          }
        })
        
        // Handle avgPower consistently
        dataPoint.avgPower = event.avg_power || null

        return dataPoint
      })

      // Calculate power rankings
      const powerRankings = PowerAnalysisUtils.calculatePowerRankings(eventDataPoints, powerData)

      return {
        events: eventDataPoints,
        keyIntervals,
        powerRankings,
        dateRange: eventDataPoints.length > 0 ? 
          `${eventDataPoints[0].date} to ${eventDataPoints[eventDataPoints.length - 1].date}` : 'none'
      }
    } catch (error) {
      console.error('Error calculating progression:', error)
      return null
    }
  },

  // Intelligent power estimation for timeline consistency
  estimateIntelligentPower(event, interval, powerData) {
    const powerInterval = powerData[interval.key]
    if (!powerInterval || !event.avg_power) return null

    // Calculate ratio: event avgPower vs typical avgPower (assume ~300W baseline)
    const avgPowerRatio = event.avg_power / 300

    // Estimate interval power based on recent peak, scaled by event performance
    let estimatedPower
    if (interval.key === 'time_5') {
      // Short duration power - more variable, higher peaks
      estimatedPower = Math.round(powerInterval.peak_recent * avgPowerRatio * 0.9)
    } else if (interval.key === 'time_15') {
      // Very short duration power
      estimatedPower = Math.round(powerInterval.peak_recent * avgPowerRatio * 0.92)
    } else if (interval.key === 'time_60') {
      // 1min power - closer to avgPower
      estimatedPower = Math.round(powerInterval.peak_recent * avgPowerRatio * 0.95)
    } else if (interval.key === 'time_300') {
      // 5min power - very close to avgPower
      estimatedPower = Math.round(powerInterval.peak_recent * avgPowerRatio * 0.98)
    } else {
      // 20min+ power - closest to avgPower
      estimatedPower = Math.round(powerInterval.peak_recent * avgPowerRatio)
    }

    // Apply reasonable bounds
    const minPower = Math.round(event.avg_power * 0.8) // At least 80% of avgPower
    const maxPower = Math.round(powerInterval.peak_recent * 1.1) // Max 110% of peak

    return Math.max(minPower, Math.min(maxPower, estimatedPower))
  }
}

export default ProgressionCalculator
