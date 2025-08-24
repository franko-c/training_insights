/**
 * Power Analysis Utilities
 * Centralized functions for power data analysis and progression calculations
 */

export const PowerAnalysisUtils = {
  // Define standard power intervals with neutral labels
  getStandardIntervals() {
    return [
      { key: 'time_5', label: '5s', color: '#dc2626', description: '5 second' },
      { key: 'time_15', label: '15s', color: '#ef4444', description: '15 second' },
      { key: 'time_60', label: '1min', color: '#ea580c', description: '1 minute' },
      { key: 'time_300', label: '5min', color: '#ca8a04', description: '5 minute' },
      { key: 'time_1200', label: '20min', color: '#16a34a', description: '20 minute' },
      { key: 'time_3600', label: '1hr', color: '#059669', description: '1 hour' }
    ]
  },

  // Get power value for specific event and interval
  getPowerForEvent(event, intervalKey, powerData) {
    if (!powerData || !powerData[intervalKey]) return null
    
    const powerInterval = powerData[intervalKey]
    const eventDate = event.event_date
    
    // Match exact dates when power peaks were achieved
    const seasonDate = powerInterval.date_season?.split('T')[0]
    const recentDate = powerInterval.date_recent?.split('T')[0]
    const lastEventDate = powerInterval.date_last_event?.split('T')[0]
    
    if (seasonDate === eventDate) {
      return { power: powerInterval.peak_season, source: 'Season PB!' }
    } else if (recentDate === eventDate) {
      return { power: powerInterval.peak_recent, source: 'Recent PB!' }
    } else if (lastEventDate === eventDate) {
      return { power: powerInterval.peak_last_event, source: 'Event PB!' }
    }
    
    return null // No power achieved on this specific event date
  },

  // Estimate power based on average power and duration
  estimatePowerFromAverage(avgPower, intervalKey) {
    if (!avgPower) return null
    
    const estimationFactors = {
      'time_5': 1.9,    // 5s - very high
      'time_15': 1.7,   // 15s - high
      'time_60': 1.4,   // 1min - elevated
      'time_300': 1.15, // 5min - slightly above FTP
      'time_1200': 1.0, // 20min - FTP baseline
      'time_3600': 0.9  // 1hr - below FTP
    }
    
    const factor = estimationFactors[intervalKey] || 1.0
    return Math.round(avgPower * factor)
  },

  // Calculate power rankings across events
  calculatePowerRankings(eventDataPoints, powerData) {
    const rankings = {}
    const intervals = this.getStandardIntervals()
    
    intervals.forEach(interval => {
      // Get events with actual power achievements for this interval
      const eventsWithPower = eventDataPoints
        .map((event, index) => ({ event, index }))
        .filter(({ event }) => {
          const powerResult = this.getPowerForEvent(event, interval.key, powerData)
          return powerResult && powerResult.power > 0
        })
        .sort((a, b) => {
          const powerA = this.getPowerForEvent(a.event, interval.key, powerData).power
          const powerB = this.getPowerForEvent(b.event, interval.key, powerData).power
          return powerB - powerA // Descending order
        })
      
      // Assign rankings (1st, 2nd, 3rd place)
      rankings[interval.key] = {}
      eventsWithPower.forEach(({ index }, rank) => {
        if (rank < 3) { // Top 3 get medals
          rankings[interval.key][index] = rank + 1
        }
      })
    })
    
    return rankings
  },

  // Calculate power progression between events
  calculateProgression(currentEvent, previousEvent, powerData) {
    const changes = []
    const intervals = ['time_60', 'time_300', 'time_1200']
    
    intervals.forEach(intervalKey => {
      const currentPower = this.getPowerForEvent(currentEvent, intervalKey, powerData)
      const previousPower = this.getPowerForEvent(previousEvent, intervalKey, powerData)
      
      if (currentPower?.power && previousPower?.power) {
        const change = currentPower.power - previousPower.power
        if (Math.abs(change) >= 5) { // Show changes >= 5W
          const label = intervalKey === 'time_60' ? '1min' : 
                       intervalKey === 'time_300' ? '5min' : '20min'
          changes.push({
            key: intervalKey,
            label,
            change,
            percent: Math.round((change / previousPower.power) * 100)
          })
        }
      }
    })
    
    // Fallback to average power if no interval changes
    if (changes.length === 0 && currentEvent.avg_power && previousEvent.avg_power) {
      const avgChange = currentEvent.avg_power - previousEvent.avg_power
      if (Math.abs(avgChange) >= 8) {
        changes.push({
          key: 'avg_power',
          label: 'Avg',
          change: avgChange,
          percent: Math.round((avgChange / previousEvent.avg_power) * 100)
        })
      }
    }
    
    return changes
  },

  // Filter intervals based on event duration
  getRelevantIntervals(eventDurationSeconds) {
    const eventDurationMin = eventDurationSeconds ? Math.round(eventDurationSeconds / 60) : 30
    const allIntervals = this.getStandardIntervals()
    
    return allIntervals.filter(interval => {
      const minDuration = {
        'time_5': 1,
        'time_15': 1,
        'time_60': 2,
        'time_300': 6,
        'time_1200': 22,
        'time_3600': 60
      }[interval.key] || 1
      
      return eventDurationMin >= minDuration
    })
  },

  // Convert ZwiftPower data to analysis format
  convertPowerDataForAnalysis(riderData) {
    const power = riderData.power || {}
    const profile = []
    
    Object.entries(power).forEach(([timeKey, data]) => {
      const seconds = parseInt(timeKey.replace('time_', ''))
      if (!isNaN(seconds) && data.peak_season) {
        // Use intelligent power selection
        let analysisValue = data.peak_season
        
        // For durations ≤ 20min, prefer recent if decline is reasonable (<25%)
        if (seconds <= 1200 && data.peak_recent && data.peak_recent < data.peak_season) {
          const decline = (data.peak_season - data.peak_recent) / data.peak_season
          if (decline <= 0.25) {
            analysisValue = data.peak_recent
          }
        }
        
        profile.push({
          duration: seconds,
          power: analysisValue,
          recent: data.peak_recent || data.peak_season,
          season: data.peak_season,
          date: data.date_season
        })
      }
    })

    return profile.sort((a, b) => a.duration - b.duration)
  },

  // Get power color based on wattage
  getPowerColor(power) {
    if (!power || power <= 0) return 'text-gray-400'
    if (power >= 600) return 'text-red-700 font-bold'
    if (power >= 500) return 'text-red-600 font-semibold'
    if (power >= 400) return 'text-orange-600 font-semibold'
    if (power >= 350) return 'text-yellow-600 font-medium'
    if (power >= 300) return 'text-green-600 font-medium'
    if (power >= 250) return 'text-blue-600'
    if (power >= 200) return 'text-indigo-600'
    return 'text-gray-600'
  },

  // Detect form changes over time
  analyzeFormTrends(events, powerData) {
    if (events.length < 3) return null
    
    const recentEvents = events.slice(-5) // Last 5 events
    const intervals = ['time_60', 'time_300', 'time_1200']
    
    const trends = intervals.map(intervalKey => {
      const powerValues = recentEvents
        .map(event => this.getPowerForEvent(event, intervalKey, powerData))
        .filter(result => result && result.power)
        .map(result => result.power)
      
      if (powerValues.length < 3) return null
      
      // Simple trend analysis - compare first half vs second half
      const midpoint = Math.floor(powerValues.length / 2)
      const firstHalf = powerValues.slice(0, midpoint)
      const secondHalf = powerValues.slice(midpoint)
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      
      const change = ((secondAvg - firstAvg) / firstAvg) * 100
      
      return {
        interval: intervalKey,
        trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
        changePercent: change
      }
    }).filter(Boolean)
    
    return trends
  }
}

export default PowerAnalysisUtils
