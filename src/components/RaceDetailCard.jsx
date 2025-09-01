import React, { useState, useEffect } from 'react'
import { EventUtils } from '../utils/eventUtils'
import { PowerAnalysisUtils } from '../utils/powerAnalysisUtils'
import { PowerFormatting } from '../utils/powerFormatting'

const RaceDetailCard = ({ event, eventType, riderId, powerData }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [powerAnalysis, setPowerAnalysis] = useState(null)

  useEffect(() => {
    if (isExpanded && powerData && event.event_date) {
      analyzePowerForEvent()
    }
  }, [isExpanded, powerData, event.event_date])

  const analyzePowerForEvent = async () => {
    // Use utility functions for power analysis
    const intervals = PowerAnalysisUtils.getStandardIntervals()
    
    const analysis = intervals.map(interval => {
      const powerKey = interval.key
      const intervalData = powerData[powerKey]
      
      if (!intervalData) return { 
        ...interval, 
        data: null, 
        power: null 
      }

      // Use the most relevant power value available
      const power = intervalData.peak_recent || intervalData.peak_last_event || intervalData.peak_season

      return {
        ...interval,
        data: intervalData,
        power: power,
        seasonBest: intervalData.peak_season,
        recentBest: intervalData.peak_recent,
        daysAgo: intervalData.date_recent ? EventUtils.getDaysAgo(intervalData.date_recent) : null
      }
    }).filter(interval => interval.power) // Only include intervals with power data

    setPowerAnalysis(analysis)
  }

  // Use utility functions for formatting and event logic

  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white">
      {/* Main Event Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-semibold text-gray-900 truncate">
                {EventUtils.getEventDisplayName(event)}
              </h4>
              
              {eventType === 'races' && event.position && (
                <div className="flex items-center space-x-1">
                  <span className={`text-sm px-2 py-1 rounded-full bg-gray-100 ${EventUtils.getPositionColor(event.position)}`}>
                    #{event.position}
                    {event.position > 100 && <span className="text-xs ml-1">(Large Field)</span>}
                  </span>
                  {event.position > 50 && event.category === 'A' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                      ⚠️ Check Data
                    </span>
                  )}
                  {EventUtils.isLikelyGroupRide(event) && (
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                      ⚠️ Mixed Data
                    </span>
                  )}
                </div>
              )}
              
              {event.category && (
                <span className={`text-xs px-2 py-1 rounded-full ${EventUtils.getCategoryBadgeColor(EventUtils.formatCategory(event.category))}`}>
                  {EventUtils.formatCategory(event.category) === 'Ladder' ? '⚡ Ladder' : `Cat ${EventUtils.formatCategory(event.category)}`}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center">
                📅 {PowerFormatting.formatDate(event.event_date)}
              </span>
              
              {event.avg_power && (
                <span className="flex items-center font-medium text-blue-600">
                  ⚡ {PowerFormatting.formatPower(event.avg_power)} avg
                </span>
              )}
              
              {event.avg_wkg && (
                <span className="flex items-center">
                  📊 {event.avg_wkg} W/kg
                </span>
              )}
              
              {event.distance && (
                <span className="flex items-center">
                  📏 {event.distance}km
                </span>
              )}
              
              {event.team && (
                <span className="flex items-center">
                  👥 {event.team}
                </span>
              )}
            </div>

            {/* Power Intervals Summary - Horizontal Layout */}
            {powerAnalysis && (
              <div className="text-sm">
                <div className="flex flex-wrap items-center space-x-3 text-gray-700">
                  <span className="text-xs text-gray-500 font-medium">Peak Power:</span>
                  {powerAnalysis
                    .filter(interval => interval.data && interval.power > 0)
                    .map((interval, idx) => (
                      <span 
                        key={idx}
                        className={`inline-flex items-center space-x-1 ${
                          interval.isRecentPB ? 'text-green-700 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-xs text-gray-500">{interval.label}:</span>
                        <span className="font-medium">{interval.power}W</span>
                        {interval.description && (
                          <span className="text-xs text-gray-400">({interval.description})</span>
                        )}
                        {interval.isRecentPB && (
                          <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                            PB
                          </span>
                        )}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {powerAnalysis ? (
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Power Performance Analysis</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {powerAnalysis.map((interval, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      interval.isRecentPB 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {interval.label}
                      </span>
                      {interval.isRecentPB && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          PB!
                        </span>
                      )}
                    </div>
                    
                    {interval.data ? (
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {interval.power}W
                        </div>
                        <div className="text-xs text-gray-500">
                          {interval.description}
                        </div>
                        {interval.seasonBest && interval.power < interval.seasonBest && (
                          <div className="text-xs text-orange-600 mt-1">
                            Season best: {interval.seasonBest}W
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No data</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-400 mb-2">⚡</div>
              <p className="text-sm text-gray-600">
                {powerData ? 'Analyzing power data...' : 'No power data available'}
              </p>
            </div>
          )}
          
          {/* Additional Event Details */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {event.event_type && (
                <div>
                  <span className="text-gray-500">Type:</span>
                  <div className="font-medium">{event.event_type.replace('TYPE_', '')}</div>
                </div>
              )}
              
              {event.time && (
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <div className="font-medium">{PowerFormatting.formatDuration(event.time)}</div>
                </div>
              )}
              
              {event.points && (
                <div>
                  <span className="text-gray-500">Points:</span>
                  <div className="font-medium">{event.points}</div>
                </div>
              )}
              
              {event.position_in_category !== undefined && (
                <div>
                  <span className="text-gray-500">Category Position:</span>
                  <div className="font-medium">#{event.position_in_category || 'N/A'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RaceDetailCard
