import React, { useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { riderDataFetcher } from '../services/riderDataFetcher'

const LandingPage = ({ onRiderSelected }) => {
  const [riderId, setRiderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate rider ID
    const validation = riderDataFetcher.validateRiderId(riderId)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    const cleanedRiderId = validation.riderId
    setLoading(true)
    setError(null)
    setProgress('Checking for existing data...')

    try {
      // First, check if we already have data for this rider
      const hasExistingData = await riderDataFetcher.hasRiderData(cleanedRiderId)
      
      if (hasExistingData) {
        setProgress('Loading existing rider data...')
        // Data exists, proceed to dashboard
        onRiderSelected(cleanedRiderId)
        return
      }

      // No existing data, need to fetch from Zwift API
      setProgress('Fetching data from Zwift API...')
      await riderDataFetcher.fetchRiderData(cleanedRiderId)
      
      setProgress('Data fetch complete! Loading dashboard...')
      onRiderSelected(cleanedRiderId)
      
    } catch (err) {
      console.error('Error loading rider:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const loadSampleData = () => {
    // Quick load for testing with known rider
    onRiderSelected('5528916')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🚴‍♂️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Zwift Racing Insights
          </h1>
          <p className="text-gray-600 text-sm">
            Internal analysis tool for Zwift racing performance
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner />
            <p className="text-gray-600 mt-4 text-sm">{progress}</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Rider ID Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="riderId" className="block text-sm font-medium text-gray-700 mb-2">
                  ZwiftPower Rider ID
                </label>
                <input
                  type="text"
                  id="riderId"
                  value={riderId}
                  onChange={(e) => setRiderId(e.target.value)}
                  placeholder="e.g., 5528916"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find your ID on your ZwiftPower profile URL
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="text-red-400 mr-3">⚠️</div>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="text-sm text-red-700 mt-1 whitespace-pre-line">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !riderId.trim()}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  loading || !riderId.trim()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Loading...' : 'Load Racing Insights'}
              </button>
            </form>

            {/* Quick Actions */}
            <div className="border-t border-gray-200 pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-3">Quick actions for testing:</p>
                <button
                  onClick={loadSampleData}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:text-gray-400"
                >
                  Load sample data (Fran Cardona - 5528916)
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                How to find your Rider ID
              </h3>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://zwiftpower.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ZwiftPower.com</a></li>
                <li>Search for your name or log in</li>
                <li>Your profile URL will contain your ID: <br/>
                    <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">
                      zwiftpower.com/profile.php?z=<strong>1234567</strong>
                    </code>
                </li>
                <li>Copy the numeric ID from the URL</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LandingPage
