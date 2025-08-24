import React, { useState, useEffect, useMemo } from 'react'
import { DataAnalysis, dataService } from '../services/dataService'
import RaceDetailCard from './RaceDetailCard'

const EventListView = ({ events = [], eventType, riderId }) => {
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showLimit, setShowLimit] = useState(10)
  const [powerData, setPowerData] = useState(null)

  useEffect(() => {
    if (riderId) {
      loadPowerData(riderId)
    }
  }, [riderId])

  const loadPowerData = async (riderId) => {
    try {
      const data = await dataService.loadRiderFile(riderId, 'power')
      setPowerData(data)
    } catch (error) {
      console.error('Error loading power data for event analysis:', error)
    }
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">
          {eventType === 'races' ? '🏆' : eventType === 'workouts' ? '💪' : '🚴'}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No {eventType.replace('_', ' ')} found
        </h3>
        <p className="text-gray-600">
          No {eventType.replace('_', ' ')} data available for rider {riderId}
        </p>
      </div>
    )
  }

  // Sort events with memoization for performance
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'date':
          aVal = new Date(a.event_date || 0)
          bVal = new Date(b.event_date || 0)
          break
        case 'power':
          aVal = a.avg_power || 0
          bVal = b.avg_power || 0
          break
        case 'position':
          aVal = a.position || 999
          bVal = b.position || 999
          break
        default:
          aVal = a.event_date || 0
          bVal = b.event_date || 0
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [events, sortBy, sortOrder])

  const displayEvents = sortedEvents.slice(0, showLimit)

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const getEventTypeIcon = (type) => {
    if (type === 'races') return '🏆'
    if (type === 'workouts') return '💪'
    return '🚴'
  }

  const getPositionColor = (position) => {
    if (!position || position > 10) return 'text-gray-600'
    if (position <= 3) return 'text-yellow-600 font-bold'
    if (position <= 10) return 'text-blue-600 font-semibold'
    return 'text-gray-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2 text-2xl">{getEventTypeIcon(eventType)}</span>
            {eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({events.length} total)
            </span>
          </h3>
          
          <div className="flex items-center space-x-4">
            {/* Sort controls */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="date">Date</option>
              <option value="power">Avg Power</option>
              {eventType === 'races' && <option value="position">Position</option>}
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        
        {/* Show limit selector */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Show:</span>
          {[10, 25, 50, events.length].map(limit => (
            <button
              key={limit}
              onClick={() => setShowLimit(limit)}
              className={`px-2 py-1 rounded ${
                showLimit === limit 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {limit === events.length ? 'All' : limit}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {displayEvents.map((event, index) => (
          <RaceDetailCard
            key={index}
            event={event}
            eventType={eventType}
            riderId={riderId}
            powerData={powerData}
          />
        ))}
      </div>
      
      {/* Footer */}
      {displayEvents.length < events.length && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={() => setShowLimit(showLimit + 25)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Show More ({events.length - displayEvents.length} remaining)
          </button>
        </div>
      )}
    </div>
  )
}

export default EventListView
