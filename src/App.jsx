import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import { fetchRiderLive } from './services/fetchRiderLive'
import { remoteLog } from './utils/logger'

function App() {
  const [currentRiderId, setCurrentRiderId] = useState(null)
  const [riderData, setRiderData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRiderSelected = async (riderOrResult) => {
    setLoading(true)
    setError(null)

    // If the caller passed a preloaded result object (from a live fetch), accept
    // several possible shapes rather than requiring a specific `riderId` field.
    if (riderOrResult && typeof riderOrResult === 'object') {
      // Try to extract riderId from common locations
      const possibleId = (
        riderOrResult.riderId ||
        riderOrResult.rider_id ||
        (riderOrResult.profile && (riderOrResult.profile.rider_id || riderOrResult.profile.id)) ||
        (riderOrResult.result && (riderOrResult.result.riderId || riderOrResult.result.rider_id))
      )

      if (possibleId) {
        const id = String(possibleId)
        setCurrentRiderId(id)
        // Normalize a minimal riderData object if the payload includes `profile` or `result`.
        // Prefer top-level profile, then result.profile, else pass the object as-is.
  const normalized = riderOrResult.profile || riderOrResult.result?.profile || riderOrResult
  // Legacy dataService hydration removed
  setRiderData(normalized)
  try { remoteLog && remoteLog('info', 'rider_selected_live', { riderId: id }) } catch(e){}
        setLoading(false)
        return
      }

      // If it's an object but we couldn't find an id, avoid coercing it to a string
      // (which becomes "[object Object]") and instead surface an error so the
      // caller can adjust the payload shape.
      setError('Received unexpected live data shape (missing rider id)')
      setLoading(false)
      return
    }

    const riderId = String(riderOrResult)
    setCurrentRiderId(riderId)

    try {
      // Fetch rider data live via backend API
      const result = await fetchRiderLive(riderId)
      // Normalize payload and extract profile if present
      const payload = result.result || result
      const normalized = payload.profile || payload
      remoteLog?.('info', 'rider_selected_cached', { riderId })
      setRiderData(normalized)
    } catch (err) {
      console.error('Failed to load rider data:', err)
      remoteLog?.('error', 'rider_load_failed', { riderId, error: String(err) })
      // Show error UI without resetting riderId
      setError(err)
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
