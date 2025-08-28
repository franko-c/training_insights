import React from 'react'

const LoadingSpinner = ({ message = 'Loading...', size = 'normal', overlay = false, steps = [], percent = null }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    normal: 'w-8 h-8', 
    large: 'w-12 h-12'
  }

  const containerClasses = overlay
    ? "fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50"
    : "flex items-center justify-center"

  return (
    <div className={containerClasses}>
      <div className={`text-center ${overlay ? 'bg-white p-6 rounded-lg shadow-lg' : ''} max-w-md w-full`}> 
        <div className="flex items-center justify-center mb-4">
          <div className={`loading-spinner ${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full mr-4`} style={{ animation: 'spin 1s linear infinite' }} />
          <div className="text-left">
            <p className="text-gray-700 font-semibold">{message}</p>
            {percent !== null && (
              <p className="text-xs text-gray-500 mt-1">{Math.round(percent)}% complete</p>
            )}
          </div>
        </div>

        {percent !== null && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
            <div style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
          </div>
        )}

        {steps && steps.length > 0 && (
          <ol className="text-left text-xs text-gray-600 space-y-1 mt-2">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-300 mr-2 mt-1" />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{s.title || s}</div>
                  {s.detail && <div className="text-xs text-gray-500">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default LoadingSpinner
