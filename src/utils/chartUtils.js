/**
 * Chart Configuration Utilities
 * Centralized chart colors, styles, and configurations
 */

export const ChartUtils = {
  // Standard color palette for power intervals
  getIntervalColors() {
    return {
      'time_5': '#dc2626',     // Red - short duration
      'time_15': '#ef4444',    // Light red
      'time_60': '#ea580c',    // Orange - 1 minute
      'time_300': '#ca8a04',   // Yellow - 5 minute  
      'time_1200': '#16a34a',  // Green - 20 minute
      'time_3600': '#059669',  // Dark green - 1 hour
      'avgPower': '#2563eb'    // Blue - average power
    }
  },

  // Get color for specific interval
  getIntervalColor(intervalKey) {
    return this.getIntervalColors()[intervalKey] || '#6b7280'
  },

  // Standard chart margins and sizing
  getChartConfig() {
    return {
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
      height: 320,
      fontSize: 11,
      strokeWidth: 2,
      dotRadius: 3
    }
  },

  // Tooltip styling
  getTooltipStyle() {
    return {
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '12px'
    }
  },

  // Format power interval labels for charts
  formatIntervalLabel(intervalKey) {
    const labelMap = {
      'time_5': '5s',
      'time_15': '15s',
      'time_60': '1min',
      'time_300': '5min',
      'time_1200': '20min',
      'time_3600': '1hr',
      'avgPower': 'Average'
    }
    return labelMap[intervalKey] || intervalKey
  },

  // Chart axis configuration
  getAxisConfig() {
    return {
      xAxis: {
        angle: -45,
        textAnchor: 'end',
        height: 60,
        fontSize: 11,
        tick: { fontSize: 11, fill: '#6b7280' }
      },
      yAxis: {
        fontSize: 11,
        tick: { fontSize: 11, fill: '#6b7280' },
        label: { value: 'Power (W)', angle: -90, position: 'insideLeft' },
        domain: ['dataMin - 50', 'dataMax + 50']
      }
    }
  },

  // Grid styling
  getGridConfig() {
    return {
      strokeDasharray: '3 3',
      stroke: '#e5e5e5'
    }
  },

  // Line chart configuration for power progression
  getPowerLineConfig(dataKey, isPrimary = false) {
    const colors = this.getIntervalColors()
    const config = this.getChartConfig()
    
    return {
      type: 'monotone',
      dataKey,
      stroke: colors[dataKey] || '#6b7280',
      strokeWidth: isPrimary ? 3 : config.strokeWidth,
      dot: { 
        r: isPrimary ? 4 : config.dotRadius, 
        fill: colors[dataKey] || '#6b7280' 
      },
      connectNulls: false,
      name: dataKey
    }
  },

  // Responsive chart dimensions
  getResponsiveConfig(containerWidth) {
    if (containerWidth < 640) { // Mobile
      return {
        height: 250,
        margin: { top: 15, right: 20, left: 15, bottom: 15 },
        fontSize: 10
      }
    } else if (containerWidth < 1024) { // Tablet
      return {
        height: 300,
        margin: { top: 20, right: 25, left: 20, bottom: 20 },
        fontSize: 11
      }
    } else { // Desktop
      return this.getChartConfig()
    }
  }
}

export default ChartUtils
