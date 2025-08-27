import React from 'react'

const LoadingSpinner = ({ message = 'Loading...', size = 'normal', overlay = false }) => {
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
      <div className={`text-center ${overlay ? 'bg-white p-6 rounded-lg shadow-lg' : ''}`}>
        <div
          className={`loading-spinner ${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4`}
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
}

export default LoadingSpinner
