import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import { dataService } from './services/dataService'

function App() {
  const [currentRiderId, setCurrentRiderId] = useState(null)
  const [riderData, setRiderData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRiderSelected = async (riderId) => {
    setLoading(true)
    setError(null)
    setCurrentRiderId(riderId)

    try {
      // Load rider data using the dataService
      const data = await dataService.loadRiderData(riderId)
      setRiderData(data)
    } catch (err) {
      console.error('Failed to load rider data:', err)
      setError(`Failed to load data for rider ${riderId}: ${err.message}`)
      setCurrentRiderId(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRiderChange = (newRiderId) => {
    // Allow switching riders - clear current state and start over
    setCurrentRiderId(null)
    setRiderData(null)
    setError(null)
    
    if (newRiderId) {
      handleRiderSelected(newRiderId)
    }
  }

  // Show landing page if no rider selected
  if (!currentRiderId) {
    return (
      <ErrorBoundary>
        <LandingPage onRiderSelected={handleRiderSelected} />
      </ErrorBoundary>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">Loading rider data...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-4">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Data</h1>
          <p className="text-gray-300 mb-6 whitespace-pre-line">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => handleRiderSelected(currentRiderId)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={() => handleRiderChange(null)} 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Choose Different Rider
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show dashboard
  return (
    <ErrorBoundary>
      <Dashboard 
        riderData={riderData} 
        onRiderChange={handleRiderChange}
      />
    </ErrorBoundary>
  )
}

export default App
