import React from 'react'

const EventTypeSelector = ({ selectedType, onTypeChange, eventCounts = {} }) => {
  const eventTypes = [
    { 
      id: 'races', 
      label: 'Races', 
      icon: '🏆',
      description: 'Competitive racing events',
      count: eventCounts.races || 0
    },
    { 
      id: 'group_rides', 
      label: 'Group Rides', 
      icon: '🚴',
      description: 'Social and training rides',
      count: eventCounts.group_rides || 0
    },
    { 
      id: 'workouts', 
      label: 'Workouts', 
      icon: '💪',
      description: 'Structured training sessions',
      count: eventCounts.workouts || 0
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Type</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {eventTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onTypeChange(type.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTypeChange(type.id)
              }
            }}
            aria-pressed={selectedType === type.id}
            aria-label={`${type.label}: ${type.count} events - ${type.description}`}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedType === type.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{type.icon}</span>
              <span className={`
                text-2xl font-bold
                ${selectedType === type.id ? 'text-blue-600' : 'text-gray-600'}
              `}>
                {type.count}
              </span>
            </div>
            
            <div className={`
              font-semibold mb-1
              ${selectedType === type.id ? 'text-blue-900' : 'text-gray-900'}
            `}>
              {type.label}
            </div>
            
            <div className={`
              text-sm
              ${selectedType === type.id ? 'text-blue-700' : 'text-gray-600'}
            `}>
              {type.description}
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-500 text-center">
        Total Events: {eventCounts.total || 0}
      </div>
    </div>
  )
}

export default EventTypeSelector
