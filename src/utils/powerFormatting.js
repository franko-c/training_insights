/**
 * Power Data Formatting Utilities
 * Centralized formatting functions for consistent display
 */

export const PowerFormatting = {
  // Format power values for display
  formatPower(watts, showUnit = true) {
    if (!watts || watts === 0) return 'N/A'
    const formatted = Math.round(watts)
    return showUnit ? `${formatted}W` : formatted.toString()
  },

  // Format power-to-weight ratio
  formatPowerToWeight(ftp, weight, precision = 2) {
    if (!ftp || !weight) return 'N/A'
    const wkg = (ftp / weight).toFixed(precision)
    return `${wkg}W/kg`
  },

  // Format percentage with specified precision
  formatPercentage(value, precision = 1) {
    if (typeof value !== 'number') return 'N/A'
    return `${value.toFixed(precision)}%`
  },

  // Format duration in minutes/hours
  formatDuration(seconds) {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  },

  // Format date consistently
  formatDate(dateStr) {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
}

export default PowerFormatting
