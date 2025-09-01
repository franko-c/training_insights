import React, { useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { fetchRiderLive } from '../services/fetchRiderLive'
import { remoteLog } from '../utils/logger'

const LandingPage = ({ onRiderSelected }) => {
  const [riderId, setRiderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('')
  const [askLiveRefresh, setAskLiveRefresh] = useState(false)
  const [pendingRiderId, setPendingRiderId] = useState(null)
  const [spinnerSteps, setSpinnerSteps] = useState([])
  const [spinnerPercent, setSpinnerPercent] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await fetchRiderLive(riderId)
      onRiderSelected(data)
    } catch (err) {
      console.error('Error fetching rider:', err)
      setError('Unable to fetch rider data. Please check the ID and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadSampleData = () => onRiderSelected('5528916')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🚴‍♂️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Zwift Racing Insights</h1>
          <p className="text-gray-600 text-sm">Internal analysis tool for Zwift racing performance</p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="text-center py-4">
              <LoadingSpinner message={progress || 'Working...'} size="large" overlay={true} steps={spinnerSteps} percent={spinnerPercent} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="animate-pulse bg-gray-50 rounded-lg p-4 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="animate-pulse bg-gray-50 rounded-lg p-4 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="animate-pulse bg-gray-50 rounded-lg p-4 shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-1/5 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/5 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="riderId" className="block text-sm font-medium text-gray-700 mb-2">ZwiftPower Rider ID</label>
                <input
                  type="text"
                  id="riderId"
                  value={riderId}
                  onChange={(e) => setRiderId(e.target.value)}
                  placeholder="e.g., 5528916"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Find your ID on your ZwiftPower profile URL</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="text-red-400 mr-3">⚠️</div>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="text-sm text-red-700 mt-1">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !riderId.trim()}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${loading || !riderId.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                {loading ? 'Loading...' : 'Load Racing Insights'}
              </button>

              {askLiveRefresh && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">No cached data found for this rider. Live fetch may take a while.</p>
                  <div className="flex justify-center gap-3">
                    <button type="button" onClick={fetchLiveNow} className="py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded">Fetch live now</button>
                    <button type="button" onClick={() => { setAskLiveRefresh(false); setPendingRiderId(null); setProgress('') }} className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">Cancel</button>
                  </div>
                </div>
              )}
            </form>

            <div className="border-t border-gray-200 pt-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-3">Quick actions for testing:</p>
                <button onClick={loadSampleData} disabled={loading} className="text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:text-gray-400">Load sample data (Fran Cardona - 5528916)</button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center"><span className="mr-2">💡</span>How to find your Rider ID</h3>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://zwiftpower.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ZwiftPower.com</a></li>
                <li>Search for your name or log in</li>
                <li>Your profile URL will contain your ID: <br/><code className="bg-gray-200 px-1 py-0.5 rounded text-xs">zwiftpower.com/profile.php?z=<strong>1234567</strong></code></li>
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
