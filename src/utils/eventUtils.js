/**
 * Event Data Processing Utilities
 * Centralized functions for event categorization, naming, and analysis
 */

export const EventUtils = {
  // Get clean event type display name
  getEventType(event) {
    const eventType = event.event_type || ''
    if (eventType.includes('TYPE_TEAM_TIME_TRIAL')) return 'Team Time Trial'
    if (eventType.includes('TYPE_TIME_TRIAL')) return 'Time Trial'
    if (eventType.includes('TYPE_RACE')) return 'Race'
    if (eventType.includes('TYPE_RIDE')) return 'Group Ride'
    return 'Event'
  },

  // Check if event is likely a group ride
  isLikelyGroupRide(event) {
    return event.event_type === 'TYPE_RIDE' || 
           event.event_type?.includes('TYPE_RIDE')
  },

  // Generate intelligent event display name
  getEventDisplayName(event) {
    const eventDate = new Date(event.event_date)
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
    
    const eventTypeDisplay = this.getEventType(event)
    const categoryInfo = this.formatCategory(event.category)
    
    // Smart event classification based on power, distance, position, and event characteristics
    let eventName = ''
    
    const avgWkg = parseFloat(event.avg_wkg) || 0
    const avgPower = event.avg_power || 0
    const distance = event.distance || 0
    const position = event.position || 0
    const hasTime = event.time && event.time > 0
    
    if (eventTypeDisplay === 'Race') {
      // Try to infer race type from characteristics
      if (distance >= 100) {
        eventName = 'Ultra Endurance Race'
      } else if (distance >= 80) {
        eventName = 'Long Distance Race'
      } else if (distance <= 15 && avgWkg > 4.0) {
        eventName = 'Criterium Sprint'
      } else if (distance <= 25 && avgWkg > 4.5) {
        eventName = 'Short Course Race'
      } else if (position > 200) {
        eventName = 'Mass Start Event'
      } else if (position > 100) {
        eventName = 'Large Field Race'
      } else if (avgWkg > 4.2 && distance < 40) {
        eventName = 'High Intensity Race'
      } else if (avgWkg > 3.8) {
        eventName = 'Competitive Race'
      } else if (hasTime && event.time < 1800) { // Under 30 minutes
        eventName = 'Sprint Race'
      } else if (hasTime && event.time > 3600) { // Over 1 hour
        eventName = 'Endurance Race'
      } else {
        eventName = 'Standard Race'
      }
    } else if (eventTypeDisplay === 'Group Ride') {
      // Categorize group rides based on intensity and distance
      if (distance >= 80) {
        eventName = 'Century Group Ride'
      } else if (distance >= 60) {
        eventName = 'Long Group Ride'
      } else if (avgWkg > 3.5) {
        eventName = 'Fast Group Ride'
      } else if (avgWkg > 3.0) {
        eventName = 'Tempo Group Ride'
      } else if (avgWkg < 2.5) {
        eventName = 'Social Group Ride'
      } else {
        eventName = 'Steady Group Ride'
      }
    } else {
      eventName = eventTypeDisplay
    }
    
    const powerInfo = avgPower ? ` - ${avgPower}W` : ''
    const wkgInfo = avgWkg ? ` (${avgWkg}w/kg)` : ''
    const distanceInfo = distance ? ` - ${distance}km` : ''
    
    // Clean, readable format with meaningful categorization
    let positionInfo = position ? ` - #${position}` : ''
    if (event.position_in_category && event.position_in_category !== position) {
      positionInfo += ` (Cat: #${event.position_in_category})`
    }
    
    return `${eventName} - ${formattedDate} - Cat ${categoryInfo}${distanceInfo}${powerInfo}${wkgInfo}${positionInfo}`
  },

  // Format category consistently
  formatCategory(category) {
    if (category === 'SEE LADDER SITE') {
      return 'Ladder'
    }
    return category
  },

  // Get category badge color
  getCategoryBadgeColor(category) {
    const colors = {
      'A+': 'bg-purple-100 text-purple-800',
      'A': 'bg-red-100 text-red-800',
      'B': 'bg-orange-100 text-orange-800',
      'C': 'bg-yellow-100 text-yellow-800',
      'D': 'bg-green-100 text-green-800',
      'E': 'bg-blue-100 text-blue-800',
      'Ladder': 'bg-indigo-100 text-indigo-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  },

  // Get position color based on placement
  getPositionColor(position) {
    if (position <= 3) return 'text-yellow-600 font-bold'
    if (position <= 10) return 'text-blue-600 font-medium'
    if (position > 100) return 'text-red-500 font-medium' // Likely large field or incorrect data
    if (position > 50) return 'text-orange-500' // Suspicious for A-category
    return 'text-gray-600'
  },

  // Calculate days between dates
  getDaysAgo(dateString) {
    if (!dateString) return null
    try {
      const targetDate = new Date(dateString)
      const today = new Date()
      const diffTime = today - targetDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch (error) {
      return null
    }
  },

  // Filter events by date range
  filterEventsByDateRange(events, dayFilter) {
    if (!dayFilter || dayFilter <= 0) return events
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - dayFilter)
    
    return events.filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate >= cutoffDate
    })
  },

  // Sort events by date (newest first)
  sortEventsByDate(events, ascending = false) {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.event_date)
      const dateB = new Date(b.event_date)
      return ascending ? dateA - dateB : dateB - dateA
    })
  },

  // Validate event has required data
  validateEventData(event) {
    const issues = []
    
    if (!event.event_date) issues.push('Missing date')
    if (!event.avg_power && !event.avg_wkg) issues.push('Missing power data')
    if (event.position > 200) issues.push('Suspicious position')
    if (event.category === 'A' && event.position > 50) issues.push('A-cat position mismatch')
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}

export default EventUtils
