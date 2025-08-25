import React, { useState, useEffect, useRef } from 'react'
import MetricsCard from './MetricsCard'
import PowerCurveChart from './PowerCurveChart'
import PowerProgressionChart from './PowerProgressionChart'
import InsightsPanel from './InsightsPanel'
import IntelligentSummary from './IntelligentSummary'
import PersonalizedWorkouts from './PersonalizedWorkouts'
import EventTypeSelector from './EventTypeSelector'
import EventListView from './EventListView'
import TooltipSimple from './TooltipSimple'
import { dataService } from '../services/dataService'
import { riderDataFetcher } from '../services/riderDataFetcher'
import { PowerCalculations } from '../utils/powerCalculations'
import { PowerFormatting } from '../utils/powerFormatting'
import { PerformanceIntelligence } from '../utils/performanceIntelligence'

const Dashboard = ({ riderData, onRiderChange }) => {
  const [selectedEventType, setSelectedEventType] = useState('races')
  const [eventData, setEventData] = useState(null)
  const [eventCounts, setEventCounts] = useState({})
  const [loading, setLoading] = useState(false)
  const [dayFilter, setDayFilter] = useState(30) // Default to 30 days
  const [powerData, setPowerData] = useState(null)
  const [performanceSummary, setPerformanceSummary] = useState(null)
  const [activeView, setActiveView] = useState('summary') // New: summary | details | workouts
  const [isScrolled, setIsScrolled] = useState(false)
  const filtersRef = useRef(null)

  // Load power data when rider changes
  useEffect(() => {
    if (riderData?.rider_id) {
      loadPowerData(riderData.rider_id)
    }
  }, [riderData?.rider_id])

  // Scroll detection for sticky filters
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Generate performance summary when data changes
  useEffect(() => {
    if (riderData && eventData?.events) {
      const recentEvents = eventData.events.slice(-10) // Last 10 events for form analysis
      const summary = PerformanceIntelligence.generatePerformanceSummary(riderData, recentEvents)
      setPerformanceSummary(summary)
    }
  }, [riderData, eventData])

  const loadPowerData = async (riderId) => {
    try {
      const data = await dataService.loadRiderFile(riderId, 'power')
      setPowerData(data)
    } catch (error) {
      console.error('Error loading power data:', error)
      setPowerData(null)
    }
  }

  // Load event data when type or filter changes
  useEffect(() => {
    console.log('🎯 Dashboard useEffect - Event type changed to:', selectedEventType)
    if (riderData?.rider_id) {
      loadEventData(riderData.rider_id, selectedEventType)
      loadEventCounts(riderData.rider_id)
    }
  }, [riderData?.rider_id, selectedEventType, dayFilter])

  // Make event type globally accessible for debugging
  useEffect(() => {
    window.selectedEventType = selectedEventType
    window.eventData = eventData
  }, [selectedEventType, eventData])

  const loadEventData = async (riderId, eventType) => {
    console.log('📡 Loading event data:', { riderId, eventType })
    setLoading(true)
    try {
      const data = await dataService.loadEventData(riderId, eventType)
      console.log('✅ Event data loaded:', data)
      
      // Apply day filter
      if (data && data.events && dayFilter > 0) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - dayFilter)
        
        const filteredEvents = data.events.filter(event => {
          const eventDate = new Date(event.event_date)
          return eventDate >= cutoffDate
        })
        
        const filteredData = {
          ...data,
          events: filteredEvents,
          count: filteredEvents.length
        }
        
        console.log(`📅 Applied ${dayFilter}-day filter: ${data.events.length} → ${filteredEvents.length} events`)
        setEventData(filteredData)
      } else {
        setEventData(data)
      }
    } catch (error) {
      console.error('❌ Error loading event data:', error)
      setEventData(null)
    } finally {
      setLoading(false)
    }
  }

  const loadEventCounts = async (riderId) => {
    try {
      const counts = await dataService.getEventCounts(riderId)
      setEventCounts(counts)
    } catch (error) {
      console.error('Error loading event counts:', error)
    }
  }
  if (!riderData) {
    return <div>No rider data available</div>
  }

  // Extract key metrics from rider data
  const metrics = {
    ftp: riderData.ftp || riderData.power?.ftp || 'N/A',
    weight: riderData.weight || 'N/A', 
    powerToWeight: riderData.power_to_weight || PowerFormatting.formatPowerToWeight(riderData.ftp || riderData.power?.ftp, riderData.weight),
    category: riderData.category || PowerCalculations.determineCategory(riderData.ftp || riderData.power?.ftp, riderData.weight),
    name: riderData.name || `Rider ${riderData.rider_id || 'Unknown'}`
  }

  const forceDataRefresh = async () => {
    if (!riderData?.rider_id) return
    
    try {
      // Show user feedback
      const confirmRefresh = window.confirm(
        `Refresh data for rider ${riderData.rider_id}?\n\n` +
        `This will fetch the latest data from Zwift API. ` +
        `If the backend API is not available, you'll get instructions for manual refresh.`
      )
      
      if (!confirmRefresh) return

      // Clear all caches first
      dataService.clearCache()
      
      // Try to refresh via the API
      await riderDataFetcher.refreshRiderData(riderData.rider_id)
      
      // Reload the page to get fresh data
      window.location.reload()
      
    } catch (error) {
      // Show error with instructions
      alert(`Data Refresh Instructions:\n\n${error.message}`)
    }
  }

  const switchRider = () => {
    const confirmSwitch = window.confirm(
      'Switch to a different rider?\n\n' +
      'This will return you to the rider selection page.'
    )
    
    if (confirmSwitch && onRiderChange) {
      onRiderChange(null)
    }
  }

  const powerCurve = riderData.power?.intervals || riderData.intervals || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🚴‍♂️ Racing Insights
              </h1>
              <p className="text-gray-600">Welcome back, {metrics.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={switchRider}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                title="Switch to a different rider"
              >
                👤 Switch Rider
              </button>
              <button
                onClick={forceDataRefresh}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                title="Refresh rider data from Zwift API"
              >
                🔄 Reload Data
              </button>
              <div className="text-right">
                <div className="text-sm text-gray-500">Category</div>
                <div className={`text-xl font-bold category-${metrics.category.toLowerCase()}`}>
                  {metrics.category}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Main Navigation */}
        <div className="bg-white border-b border-gray-200 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'summary', label: 'Performance Summary', icon: '🎯', description: 'What you need to know' },
                { id: 'details', label: 'Detailed Analysis', icon: '📊', description: 'Charts and progression' },
                { id: 'workouts', label: 'Personalized Training', icon: '💪', description: 'Custom workouts' }
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors group ${
                    activeView === view.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{view.icon}</span>
                    <div className="text-left">
                      <div className="font-semibold">{view.label}</div>
                      <div className="text-xs text-gray-400 group-hover:text-gray-500">
                        {view.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Based on Active View */}
        {activeView === 'summary' && (
          <div className="space-y-8">
            {/* Intelligent Performance Summary */}
            <IntelligentSummary 
              riderData={riderData}
              recentEvents={eventData?.events?.slice(-10) || []}
            />
            
            {/* Key Metrics Row - Simplified for summary view */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricsCard
                title={
                  <TooltipSimple 
                    content="20-minute power value - commonly used as a performance benchmark and reference point for training intensity."
                    scientific={true}
                  >
                    20min Power
                  </TooltipSimple>
                }
                value={metrics.ftp}
                unit="W"
                icon="⚡"
              />
              <MetricsCard
                title={
                  <TooltipSimple 
                    content="Your power-to-weight ratio is critical for climbing performance and Zwift racing categories. Measured in watts per kilogram (W/kg)."
                    scientific={true}
                  >
                    Power/Weight
                  </TooltipSimple>
                }
                value={metrics.powerToWeight}
                unit="W/kg"
                icon="📊"
              />
              <MetricsCard
                title={
                  <TooltipSimple 
                    content="Zwift racing categories based on power-to-weight ratio. Category thresholds help ensure fair competition across different fitness levels."
                  >
                    Racing Category
                  </TooltipSimple>
                }
                value={metrics.category}
                unit=""
                icon="🏆"
              />
            </div>
          </div>
        )}

        {activeView === 'workouts' && (
          <div className="space-y-8">
            {/* Personalized Workout Generator */}
            <PersonalizedWorkouts 
              riderData={riderData}
              focusArea={performanceSummary?.focusAreas?.[0]}
            />
          </div>
        )}

        {activeView === 'details' && (
          <div className="space-y-8">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricsCard
                title={
                  <TooltipSimple 
                    content="20-minute power value - commonly used as a performance benchmark and reference point for training intensity."
                    scientific={true}
                  >
                    20min Power
                  </TooltipSimple>
                }
                value={metrics.ftp}
                unit="W"
                icon="⚡"
              />
              <MetricsCard
                title={
                  <TooltipSimple 
                    content="Your power-to-weight ratio is critical for climbing performance and Zwift racing categories. Measured in watts per kilogram (W/kg)."
                    scientific={true}
                  >
                    Power/Weight
                  </TooltipSimple>
                }
                value={metrics.powerToWeight}
                unit="W/kg"
                icon="📊"
              />
              <MetricsCard
                title={
                  <TooltipSimple 
                    content="Zwift racing categories based on power-to-weight ratio. Category thresholds help ensure fair competition across different fitness levels."
                  >
                    Racing Category
                  </TooltipSimple>
                }
                value={metrics.category}
                unit=""
                icon="🏆"
              />
            </div>

            {/* Always Expanded Filter Bar - Sticky when scrolled */}
            <div 
              ref={filtersRef}
              className={`sticky top-0 z-20 bg-white border-b border-gray-200 transition-all duration-300 ${
                isScrolled ? 'shadow-md' : ''
              }`}
              style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem' }}
            >
              <div className="px-4 sm:px-6 py-3">
                {/* Expanded View - Always Visible */}
                <div className="space-y-4">
                  {/* Event Type Selector - Centered */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 hidden sm:inline">Event Type:</span>
                      <div className="flex space-x-1 sm:space-x-2">
                        {[
                          { id: 'races', label: 'Races', shortLabel: 'Races', icon: '🏆' },
                          { id: 'group_rides', label: 'Group Rides', shortLabel: 'Rides', icon: '🚴' },
                          { id: 'workouts', label: 'Workouts', shortLabel: 'Workouts', icon: '💪' }
                        ].map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setSelectedEventType(type.id)}
                            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                              selectedEventType === type.id
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span className="mr-1">{type.icon}</span>
                            <span className="hidden sm:inline">{type.label}</span>
                            <span className="sm:hidden">{type.shortLabel}</span>
                            {eventCounts[type.id] ? (
                              <span className="ml-1 text-xs opacity-75">
                                ({eventCounts[type.id]})
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Time Range Filter - Centered */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                      <span className="text-sm font-medium text-gray-700 hidden sm:inline">Time Range:</span>
                      <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                        {[14, 30, 60, 90, 0].map((days) => (
                          <button
                            key={days}
                            onClick={() => setDayFilter(days)}
                            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                              dayFilter === days
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {days === 0 ? 'All' : `${days}d`}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {eventData && eventData.events && (
                      <span className="text-xs sm:text-sm text-gray-600 text-center">
                        Showing <span className="font-medium text-blue-600">{eventData.events.length}</span> 
                        <span className="hidden sm:inline"> {selectedEventType.replace('_', ' ')}</span>
                        <span className="sm:inline"> events</span>
                        {dayFilter > 0 && <span> from the last {dayFilter} days</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Power Curve Visualization */}
            <div className="bg-white rounded-lg shadow-sm mb-8 mt-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">⚡</span>
                  <TooltipSimple 
                    content="Your power profile shows peak power outputs across different durations, revealing strengths and weaknesses in different energy systems."
                    scientific={true}
                  >
                    Power Profile - {selectedEventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </TooltipSimple>
                </h2>
                <PowerCurveChart 
                  key={`power-curve-${selectedEventType}`}
                  data={riderData} 
                  selectedEventType={selectedEventType}
                  eventData={eventData}
                  dayFilter={dayFilter}
                />
              </div>

              {/* Power Progression Chart - New Feature */}
              <div className="mb-8">
                <PowerProgressionChart
                  key={`power-progression-${selectedEventType}`}
                  selectedEventType={selectedEventType}
                  eventData={eventData}
                  powerData={powerData}
                  dayFilter={dayFilter}
                />
              </div>
            </div>

            {/* Event List View */}
            <div className="mb-8">
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <div className="text-gray-400 text-2xl mb-2">⏳</div>
                  <p className="text-gray-600">Loading {selectedEventType.replace('_', ' ')}...</p>
                </div>
              ) : (
                <EventListView
                  events={eventData?.events || []}
                  eventType={selectedEventType}
                  riderId={riderData?.rider_id}
                />
              )}
            </div>

            {/* Scientific Insights Panel */}
            <InsightsPanel riderData={riderData} />
          </div>
        )}

      </main>
    </div>
  )
}

export default Dashboard
