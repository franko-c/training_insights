import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import TooltipComponent from './TooltipSimple'
import { dataService } from '../services/dataService'
import { PowerFormatting } from '../utils/powerFormatting'

// CACHE BUSTER: Force component reload - v2.2 FIXED PROPS
const PowerCurveChart = ({ selectedEventType, eventData, data, dayFilter }) => {
  const [powerData, setPowerData] = useState(null)
  const [filteredPowerData, setFilteredPowerData] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Enable tooltips for better UX
  const tooltipsEnabled = true

  // Early return if no data provided
  if (!data) {
    console.log('⚠️ PowerCurveChart: No data prop provided')
    return <div className="p-4 text-gray-500">Loading rider data...</div>
  }

  useEffect(() => {
    console.log('🔄 PowerCurveChart data effect:', {
      hasData: !!data,
      riderId: data?.rider_id,
      dataKeys: data ? Object.keys(data) : 'no data'
    })
    
    if (data?.rider_id) {
      loadPowerData(data.rider_id)
    }
  }, [data?.rider_id])

  // CRITICAL FIX: React to event type changes with dependency control
  useEffect(() => {
    console.log('🔥 PowerCurveChart useEffect triggered [UPDATED]:', {
      powerData: !!powerData,
      selectedEventType,
      eventData: eventData ? `${eventData.events?.length} events` : 'null',
      eventDataLatestDate: eventData?.latest_date
    })
    
    if (powerData && selectedEventType) {
      // Handle case where filtering results in zero events
      if (!eventData?.events?.length) {
        console.log('📊 No events after filtering - showing baseline power data')
        // CRITICAL FIX: Still apply event type filtering even with no events
        const filteredData = { ...powerData }
        Object.keys(filteredData).forEach(key => {
          if (key.startsWith('time_')) {
            const duration = parseInt(key.replace('time_', ''))
            const eventTypeFilters = {
              'races': [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200],
              'group_rides': [60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 2400, 3600],
              'workouts': [15, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 3600]
            }
            const relevantDurations = eventTypeFilters[selectedEventType] || []
            const isRelevant = relevantDurations.includes(duration)
            
            filteredData[key] = {
              ...filteredData[key],
              is_relevant: isRelevant,
              time_range_power: filteredData[key].peak_season,
              power_source: 'season'
            }
          }
        })
        setFilteredPowerData(filteredData)
        return
      }
      
      // Process filtered event data from Dashboard (respects day filter)
      console.log('✅ Processing filtered event data [VALIDATION REMOVED]:', {
        selectedEventType,
        eventCount: eventData.events.length,
        latestDate: eventData.latest_date || 'unknown'
      })
      
      // Calculate power values from actual visible events
      calculateEventSpecificPowerData()
    } else {
      console.log('❌ Missing data for filtering:', {
        powerData: !!powerData,
        selectedEventType,
        eventDataEvents: eventData?.events?.length || 0
      })
      // Don't clear filtered data if we're just missing event data temporarily
      if (!selectedEventType) {
        setFilteredPowerData(powerData)
      }
    }
  }, [powerData, selectedEventType, eventData?.events?.length, eventData?.latest_date, dayFilter]) // Add dayFilter to deps

  const calculateEventSpecificPowerData = () => {
    console.log('🔍 Filtering power data by time range...')
    
    if (!powerData) {
      console.log('❌ No power data available')
      setFilteredPowerData(null)
      return
    }

    if (!eventData?.events?.length) {
      console.log('❌ No event data available, using baseline power data')
      setFilteredPowerData(powerData)
      return
    }

    // REAL EVENT TYPE FILTERING: Different power intervals matter for different activities
    const eventTypeFilters = {
      'races': {
        // Races: Focus on short to medium power (5s to 20min), less emphasis on longer duration
        relevantDurations: [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200],
        name: 'Race Power Profile'
      },
      'group_rides': {
        // Group rides: Focus on sustained power (1min to 1hr), emphasis on endurance capacity
        relevantDurations: [60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 2400, 3600],
        name: 'Group Ride Power Profile'  
      },
      'workouts': {
        // Workouts: Focus on training intervals (15s to 1hr), structured training zones
        relevantDurations: [15, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 3600],
        name: 'Workout Power Profile'
      }
    }

    const filter = eventTypeFilters[selectedEventType] || {
      relevantDurations: Object.keys(powerData).filter(k => k.startsWith('time_')).map(k => parseInt(k.replace('time_', ''))),
      name: 'All Power Data'
    }
    
    console.log(`📊 Event type ${selectedEventType}:`, {
      totalEvents: eventData.events.length,
      filterName: filter.name,
      relevantDurations: filter.relevantDurations.length,
      sampleDurations: filter.relevantDurations.slice(0, 5)
    })

    // Get date range of visible events for power filtering
    const eventDates = eventData.events.map(event => event.event_date)
    const earliestDate = eventDates.sort()[0]
    const latestDate = eventDates.sort()[eventDates.length - 1]
    
    // Create filtered power data with time-range specific values
    const filteredData = { ...powerData }
    
    // Filter power values based on the time range of visible events
    Object.keys(filteredData).forEach(key => {
      if (key.startsWith('time_')) {
        const duration = parseInt(key.replace('time_', ''))
        const isRelevant = filter.relevantDurations.includes(duration)
        const timeData = filteredData[key]
        
        // Determine which power value to show based on time range
        let timeRangePower = null
        let powerSource = 'season'
        let powerDate = null
        
        // CRITICAL FIX: Handle "All Time" filter (dayFilter = 0) properly
        if (dayFilter === 0) {
          // All time - use season best power
          timeRangePower = timeData.peak_season
          powerSource = 'season'
          powerDate = timeData.date_season
        } else if (eventDates.length > 0 && dayFilter <= 60) {
          // Short time range - try to use recent power within the date range
          if (timeData.date_recent && isDateInRange(timeData.date_recent, earliestDate, latestDate)) {
            timeRangePower = timeData.peak_recent
            powerSource = 'recent'
            powerDate = timeData.date_recent
          } else if (timeData.date_last_event && isDateInRange(timeData.date_last_event, earliestDate, latestDate)) {
            timeRangePower = timeData.peak_last_event
            powerSource = 'last_event'
            powerDate = timeData.date_last_event
          } else {
            // Fall back to recent if no data in range
            timeRangePower = timeData.peak_recent || timeData.peak_season
            powerSource = 'recent'
            powerDate = timeData.date_recent || timeData.date_season
          }
        } else {
          // Longer time range or no specific events - use season power
          timeRangePower = timeData.peak_season
          powerSource = 'season'
          powerDate = timeData.date_season
        }
        
        // CRITICAL: Always ensure we have a power value
        if (!timeRangePower) {
          timeRangePower = timeData.peak_season || timeData.peak_recent || timeData.peak_last_event
          powerSource = 'fallback'
          powerDate = timeData.date_season || timeData.date_recent || timeData.date_last_event
        }
        
        filteredData[key] = {
          ...filteredData[key],
          is_relevant: isRelevant,
          time_range_power: timeRangePower,
          power_source: powerSource,
          power_date: powerDate
        }
      }
    })

    // Count relevant intervals for logging
    let relevantCount = 0
    Object.keys(filteredData).forEach(key => {
      if (key.startsWith('time_') && filteredData[key].is_relevant) {
        relevantCount++
      }
    })

    console.log('✅ Time-range power filtering complete:', {
      totalIntervals: Object.keys(powerData).filter(k => k.startsWith('time_')).length,
      relevantIntervals: relevantCount,
      eventsInRange: eventData.events.length,
      dateRange: `${earliestDate} to ${latestDate}`,
      timeWindow: filter.name,
      dayFilter: dayFilter || 'All time'
    })

    setFilteredPowerData(filteredData)
  }

  // Helper function to check if a date is within the event range
  const isDateInRange = (powerDate, earliestEventDate, latestEventDate) => {
    if (!powerDate || !earliestEventDate || !latestEventDate) return false
    
    // Convert power date (ISO format) to simple date for comparison
    const powerDateStr = powerDate.split('T')[0] // "2025-08-20T18:10:00" -> "2025-08-20"
    
    return powerDateStr >= earliestEventDate && powerDateStr <= latestEventDate
  }

  // Helper function to calculate days ago from a date
  const getDaysAgo = (dateString) => {
    if (!dateString) return null
    
    try {
      const powerDate = new Date(dateString)
      const today = new Date()
      const diffTime = today - powerDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays
    } catch (error) {
      console.error('Error calculating days ago:', error)
      return null
    }
  }

  const loadPowerData = async (riderId) => {
    setLoading(true)
    try {
      const powerInfo = await dataService.loadRiderFile(riderId, 'power')
      setPowerData(powerInfo)
    } catch (error) {
      console.error('Error loading power data:', error)
      setPowerData(null)
    } finally {
      setLoading(false)
    }
  }

  // Simple function to get context for the current event type
  const getEventTypeContext = () => {
    if (!selectedEventType || !eventData?.events?.length) return null
    
    const eventCount = eventData.events.length
    const eventTypeDisplay = selectedEventType.replace('_', ' ')
    
    return {
      count: eventCount,
      type: eventTypeDisplay,
      latest: eventData.latest_date
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p>Loading power data...</p>
        </div>
      </div>
    )
  }

  if (!powerData) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <p>No power curve data available</p>
          <p className="text-sm">Run data extraction to generate power profile</p>
        </div>
      </div>
    )
  }

  // Use filtered data when available
  const activeData = filteredPowerData || powerData

  // Transform the power data into chart format - ONLY USE RELEVANT DATA
  const chartData = []
  let relevantDataPoints = 0
  
  Object.entries(activeData).forEach(([timeKey, data]) => {
    if (timeKey.startsWith('time_')) {
      // AGGRESSIVE FILTERING: Only include intervals that are actually relevant to this event type
      if (filteredPowerData) {
        // When we have filtered data, be very strict about relevance
        if (!data.is_relevant) {
          return; // Skip irrelevant intervals completely
        }
        relevantDataPoints++
      }
      
      const seconds = parseInt(timeKey.replace('time_', ''))
      
      // Convert seconds to readable time format
      let timeLabel
      if (seconds < 60) {
        timeLabel = `${seconds}s`
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        timeLabel = remainingSeconds === 0 ? `${minutes}m` : `${minutes}m${remainingSeconds}s`
      } else {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        timeLabel = minutes === 0 ? `${hours}h` : `${hours}h${minutes}m`
      }
      
      chartData.push({
        duration: seconds,
        timeLabel,
        seasonPower: data.peak_season,
        recentPower: data.peak_recent || data.peak_season,
        lastEventPower: data.peak_last_event || data.peak_recent || data.peak_season,
        // Use time-range specific power
        timeRangePower: data.time_range_power || data.peak_recent || data.peak_season,
        isRelevant: data.is_relevant,
        powerSource: data.power_source || 'season',
        powerDate: data.power_date,
        // Add progression context
        daysAgo: data.power_date ? getDaysAgo(data.power_date) : null,
        // Add debug info
        debugInfo: {
          selectedEventType,
          isFiltered: !!filteredPowerData,
          timeRangePower: data.time_range_power,
          powerSource: data.power_source,
          dayFilter: dayFilter
        }
      })
    }
  })

  // Sort by duration and use intelligent sampling for clean visualization
  const sortedData = chartData.sort((a, b) => a.duration - b.duration)
  
  // Key time points that should always be included (but only if relevant)
  const keyDurations = [1, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480, 600, 900, 1200, 1800, 2400, 3600]
  
  // Create intelligent sampling that includes key points and avoids overcrowding
  const visualData = []
  const includedDurations = new Set()
  
  // IMPORTANT: Only include data points that are actually relevant when we have filtered data
  const relevantData = filteredPowerData ? 
    sortedData.filter(d => d.isRelevant !== false) : 
    sortedData
  
  // CRITICAL FIX: Use only relevant data for chart rendering to prevent showing all data
  const baseDataForChart = relevantData  // This ensures we only show filtered data
  
  // Always include key durations if they exist AND are relevant
  keyDurations.forEach(keyDuration => {
    const dataPoint = baseDataForChart.find(d => d.duration === keyDuration)
    if (dataPoint) {
      visualData.push(dataPoint)
      includedDurations.add(keyDuration)
    }
  })
  
  // Add additional points for smooth curves from relevant data only
  baseDataForChart.forEach((point, index) => {
    if (!includedDurations.has(point.duration)) {
      // Include every 10th point for shorter durations, every 20th for longer
      const interval = point.duration < 300 ? 8 : point.duration < 1800 ? 12 : 20
      if (index % interval === 0) {
        visualData.push(point)
        includedDurations.add(point.duration)
      }
    }
  })
  
  // Sort final data by duration
  visualData.sort((a, b) => a.duration - b.duration)

  // DEBUGGING: Log when chart data changes
  console.log('📊 PowerCurveChart render data:', {
    selectedEventType,
    eventDataCount: eventData?.events?.length || 0,
    visualDataPoints: visualData.length,
    relevantDataPoints: relevantDataPoints || baseDataForChart.length,
    actualChartData: chartData.length,
    filteredDataActive: !!filteredPowerData,
    baseDataUsed: baseDataForChart.length,
    sampleData: visualData.slice(0, 3),
    timeWindow: filteredPowerData ? 'Last 60 days (Filtered)' : 'All time (Unfiltered)',
    chartKey: `power-chart-${selectedEventType}-${eventData?.events?.length || 0}`
  })

  // Key interval markers for reference - more vibrant colors
  const keyIntervals = [
    { duration: 5, label: '5s', color: '#ff0066' },
    { duration: 15, label: '15s', color: '#ff3300' },
    { duration: 60, label: '1min', color: '#ffaa00' },
    { duration: 300, label: '5min', color: '#00dd44' },
    { duration: 1200, label: '20min', color: '#0088ff' },
    { duration: 3600, label: '1hr', color: '#8833ff' }
  ]

  return (
    <div className="power-curve-chart">
        {/* Event Type Context with Data Source Explanation */}
        {getEventTypeContext() && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="flex flex-col gap-2">
              <div className="text-sm">
                <div className="text-blue-800 font-medium mb-1">
                  📊 Showing {getEventTypeContext().count} {getEventTypeContext().type} in selected timeframe
                </div>
                {getEventTypeContext().latest && (
                  <div className="text-blue-600 text-xs">
                    Latest: {new Date(getEventTypeContext().latest).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>
              
              {/* Updated data context note */}
              <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded">
                <div className="font-semibold mb-2">📈 Power Values Explained:</div>
                <div className="text-center leading-relaxed">
                  {dayFilter === 0 ? (
                    <>Blue values show your all-time best power values across all activities. </>
                  ) : dayFilter > 0 ? (
                    <>Blue values show your best power from the last {dayFilter} days. </>
                  ) : (
                    <>Blue values show your best power from the selected timeframe. </>
                  )}
                  "All-Time Best" represents your peak power ever recorded. 
                  {dayFilter > 0 && " The time range filter helps you see recent form vs historical peaks."}
                  {" "}The chart helps you compare current performance to your personal bests.
                </div>
              </div>
            </div>
          </div>
        )}      <div className="h-80 sm:h-96 bg-white rounded-lg p-3 sm:p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            key={`power-chart-${selectedEventType}-${eventData?.events?.length || 0}`}
            data={visualData} 
            margin={{ 
              top: 20, 
              right: window.innerWidth < 640 ? 10 : 30, 
              left: window.innerWidth < 640 ? 10 : 20, 
              bottom: window.innerWidth < 640 ? 45 : 60 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timeLabel"
              angle={window.innerWidth < 640 ? -60 : -45}
              textAnchor="end"
              height={window.innerWidth < 640 ? 45 : 60}
              fontSize={window.innerWidth < 640 ? 10 : 12}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            
            {/* Reference lines for key intervals with vibrant colors */}
            {keyIntervals.map((interval) => (
              <ReferenceLine 
                key={interval.duration}
                x={visualData.find(d => d.duration === interval.duration)?.timeLabel}
                stroke={interval.color}
                strokeDasharray="4 2"
                strokeOpacity={0.8}
                strokeWidth={2}
              />
            ))}
            
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#f9fafb',
                fontSize: '12px'
              }}
              formatter={(value, name) => {
                if (!value) return [null, null]
                return [
                  `${value}W`, 
                  name === 'seasonPower' ? 'All-Time Best' : 
                  name === 'timeRangePower' ? (dayFilter === 0 ? 'All-Time Best' : `Time Range Best${dayFilter > 0 ? ` (${dayFilter}d)` : ''}`) : 
                  name === 'recentPower' ? 'Recent Form' : 
                  name === 'lastEventPower' ? 'Last Event' : name
                ]
              }}
              labelFormatter={(label) => `Duration: ${label}`}
            />
            
            {/* Season best power curve - Blue line */}
            <Line 
              type="monotone" 
              dataKey="seasonPower" 
              stroke="#2563eb" 
              strokeWidth={3}
              dot={false}
              name="seasonPower"
              strokeLinecap="round"
            />
            
            {/* Time range specific power curve - Bold green line */}
            <Line 
              type="monotone" 
              dataKey="timeRangePower" 
              stroke="#16a34a" 
              strokeWidth={4}
              dot={{r: 3, fill: '#16a34a', strokeWidth: 2, stroke: '#fff'}}
              name="timeRangePower"
              strokeLinecap="round"
            />
            
            {/* Recent power curve - Orange line */}
            <Line 
              type="monotone" 
              dataKey="recentPower" 
              stroke="#ea580c" 
              strokeWidth={2}
              dot={false}
              name="recentPower"
              strokeLinecap="round"
              strokeDasharray="5 5"
            />
            
            {/* Last event power curve - Light gray dashed line */}
            <Line 
              type="monotone" 
              dataKey="lastEventPower" 
              stroke="#9ca3af" 
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              name="lastEventPower"
              strokeLinecap="round"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and key insights */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
        <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
          <div className="power-legend-item">
            <div className="w-6 h-1 bg-blue-600 rounded"></div>
            <span className="text-gray-700 font-medium">
              <TooltipComponent 
                content="Your all-time best power outputs across all durations - represents your peak capabilities ever recorded."
                disabled={!tooltipsEnabled}
              >
                All-Time Best
              </TooltipComponent>
            </span>
          </div>
          <div className="power-legend-item">
            <div className="w-6 h-1 bg-green-600 rounded"></div>
            <span className="text-gray-700 font-medium">
              <TooltipComponent 
                content={dayFilter === 0 ? 
                  'All-time best power curve - same as blue line when viewing all data' :
                  `Power curve for the selected time range (last ${dayFilter} days). Shows your best efforts during the filtered period.`
                }
                disabled={!tooltipsEnabled}
              >
                {dayFilter === 0 ? 'All-Time Best' : 'Time Range Best'}
              </TooltipComponent>
            </span>
          </div>
          <div className="power-legend-item">
            <div className="w-6 h-1 bg-orange-600 rounded" style={{background: 'repeating-linear-gradient(90deg, #ea580c 0, #ea580c 5px, transparent 5px, transparent 10px)'}}></div>
            <span className="text-gray-700 font-medium">
              <TooltipComponent 
                content="Your recent power outputs (last few weeks) - shows current form and fitness trends."
                disabled={!tooltipsEnabled}
              >
                Recent Form
              </TooltipComponent>
            </span>
          </div>
        </div>
        </div>

        {/* Key power numbers - improved grid */}
        <div className="power-intervals-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {keyIntervals.map((interval) => {
            // CRITICAL FIX: Use visualData (filtered) instead of chartData (unfiltered)
            const dataPoint = visualData.find(d => d.duration === interval.duration)
            
            // Fallback: if not in visualData, try to get from raw powerData
            const fallbackData = !dataPoint && powerData[`time_${interval.duration}`] ? {
              duration: interval.duration,
              seasonPower: powerData[`time_${interval.duration}`].peak_season,
              recentPower: powerData[`time_${interval.duration}`].peak_recent,
              timeRangePower: powerData[`time_${interval.duration}`].peak_season,
              isRelevant: false, // Mark as not relevant for this event type
              powerSource: 'season',
              powerDate: powerData[`time_${interval.duration}`].date_season,
              daysAgo: powerData[`time_${interval.duration}`].date_season ? getDaysAgo(powerData[`time_${interval.duration}`].date_season) : null
            } : null
            
            const finalDataPoint = dataPoint || fallbackData
            
            // Show power values based on relevance and time range
            // FIXED: Handle missing dataPoint gracefully
            const isRelevantDuration = finalDataPoint ? (filteredPowerData ? finalDataPoint.isRelevant === true : true) : false
            
            // Use the appropriate power value based on the time range filter
            let powerValue, displayMode, dataSource, daysAgoText
            
            if (isRelevantDuration && finalDataPoint?.timeRangePower) {
              // Use power from the selected time range
              powerValue = finalDataPoint.timeRangePower
              displayMode = 'time-range'
              if (dayFilter === 0) {
                dataSource = 'All Time Best'
              } else {
                dataSource = finalDataPoint.powerSource === 'recent' ? `Last ${dayFilter}d` : 
                           finalDataPoint.powerSource === 'last_event' ? 'Recent Event' :
                           `Last ${dayFilter}d`
              }
              
              // Calculate when this peak was achieved
              if (finalDataPoint.daysAgo !== null) {
                if (finalDataPoint.daysAgo === 0) {
                  daysAgoText = 'Today'
                } else if (finalDataPoint.daysAgo === 1) {
                  daysAgoText = '1d ago'
                } else if (finalDataPoint.daysAgo < 30) {
                  daysAgoText = `${finalDataPoint.daysAgo}d ago`
                } else if (finalDataPoint.daysAgo < 365) {
                  const monthsAgo = Math.floor(finalDataPoint.daysAgo / 30)
                  daysAgoText = `${monthsAgo}mo ago`
                } else {
                  const yearsAgo = Math.floor(finalDataPoint.daysAgo / 365)
                  daysAgoText = `${yearsAgo}y ago`
                }
              }
            } else if (finalDataPoint?.seasonPower) {
              // Fall back to season best - always available
              powerValue = finalDataPoint.seasonPower
              displayMode = isRelevantDuration ? 'season' : 'season-dimmed'
              dataSource = 'All Time Best'
            } else if (finalDataPoint?.recentPower) {
              // Emergency fallback to recent power
              powerValue = finalDataPoint.recentPower
              displayMode = isRelevantDuration ? 'recent' : 'recent-dimmed'
              dataSource = 'Recent Best'
            } else {
              // Last resort - no data available
              powerValue = null
              displayMode = 'none'
              dataSource = 'No Data'
            }
            
            // Debug logging for key intervals
            if (interval.duration === 5 || interval.duration === 60 || interval.duration === 1200) {
              console.log(`🔋 ${interval.duration}s Power Debug:`, {
                selectedEventType,
                isRelevantDuration,
                displayMode,
                dataSource,
                timeRangePower: finalDataPoint?.timeRangePower,
                seasonPower: finalDataPoint?.seasonPower,
                powerSource: finalDataPoint?.powerSource,
                daysAgo: finalDataPoint?.daysAgo,
                daysAgoText,
                dayFilter: dayFilter,
                finalValue: powerValue,
                dataPointFound: !!dataPoint,
                fallbackUsed: !!fallbackData,
                hasFilteredData: !!filteredPowerData
              })
            }
            
            return (
              <div key={interval.duration} className={`power-interval-card ${
                !isRelevantDuration ? 'opacity-60 border-dashed' : ''
              }`} style={{ 
                borderLeftColor: interval.color, 
                borderLeftWidth: '4px',
                borderLeftStyle: isRelevantDuration ? 'solid' : 'dashed'
              }}>
                <div className="power-interval-label">
                  <TooltipComponent 
                    content={
                      !isRelevantDuration ? 
                        `${interval.duration === 5 ? "5 second power" :
                        interval.duration === 15 ? "15 second power" :
                        interval.duration === 60 ? "1 minute power" :
                        interval.duration === 300 ? "5 minute power" :
                        interval.duration === 1200 ? "20 minute power" :
                        "1 hour power"} - Not typically relevant for ${selectedEventType?.replace('_', ' ')}`
                        :
                        interval.duration === 5 ? "5 second power - maximum explosive output" :
                        interval.duration === 15 ? "15 second power - short burst capability" :
                        interval.duration === 60 ? "1 minute power - sustained high intensity" :
                        interval.duration === 300 ? "5 minute power" :
                        interval.duration === 1200 ? "20 minute power" :
                        "1 hour power"
                    }
                    isScientific={true}
                    disabled={!tooltipsEnabled}
                  >
                    {interval.label}
                    {!isRelevantDuration && (
                      <span className="text-xs text-gray-400 ml-1">*</span>
                    )}
                  </TooltipComponent>
                </div>
                <div className={`power-interval-value ${
                  displayMode === 'time-range' ? 'text-blue-600 font-bold' : 
                  displayMode === 'season' ? 'text-gray-600' :
                  displayMode === 'recent' ? 'text-orange-600' :
                  'text-gray-400'
                }`}>
                  {powerValue ? PowerFormatting.formatPower(powerValue) : '—'}
                  
                  {/* Show when peak was achieved */}
                  {daysAgoText && (
                    <div className="text-xs text-purple-600 font-medium mt-0.5">
                      {daysAgoText}
                    </div>
                  )}
                  
                  {/* Clear data source indicator */}
                  <div className="text-xs mt-1">
                    <span className={`px-1 py-0.5 rounded text-xs ${
                      displayMode === 'time-range' 
                        ? 'bg-blue-100 text-blue-600' 
                        : displayMode === 'season'
                        ? 'bg-gray-100 text-gray-600'
                        : displayMode === 'recent'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {dataSource}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PowerCurveChart
