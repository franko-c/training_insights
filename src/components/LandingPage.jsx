import React, { useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { riderDataFetcher } from '../services/riderDataFetcher'
import { dataService } from '../services/dataService'
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

    const validation = riderDataFetcher.validateRiderId(riderId)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    const cleanedRiderId = validation.riderId
    // Do a quick cached check without showing the full overlay spinner to avoid a flash.
    setProgress('Checking for cached data...')
    setSpinnerSteps([])
    setSpinnerPercent(null)

    try {
      const found = await riderDataFetcher.hasRiderData(cleanedRiderId)
      if (found) {
        setProgress('Found cached data — opening dashboard')
        // small delay so the UI doesn't jarringly switch
        setTimeout(() => onRiderSelected(cleanedRiderId), 150)
        return
      }

      // No cached data — ask before live fetch
      setPendingRiderId(cleanedRiderId)
      setAskLiveRefresh(true)
      setProgress('No cached data available — confirm to fetch live')
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const fetchLiveNow = async () => {
    if (!pendingRiderId) return
    setAskLiveRefresh(false)
    setLoading(true)
    setProgress('Starting live fetch — this may take ~10-30s')
  setSpinnerSteps([{ title: 'Fetching...' }])
  setSpinnerPercent(5)

  // Simulated progress fallback: advance percent slowly until backend reports progress
    let simulated = true
    let simPerc = 5
  remoteLog('info', 'landing_fetch_start', { riderId: pendingRiderId })
    const simInterval = setInterval(() => {
      if (!simulated) return
      simPerc = Math.min(70, simPerc + Math.random() * 8)
      setSpinnerPercent(simPerc)
      // Ensure only a single fetching step exists: remove any prior fetching entries
      setSpinnerSteps((prev) => {
        const prevSteps = Array.isArray(prev) ? prev : []
        const other = prevSteps.filter(s => !(s && s.title && s.title.startsWith('Fetching...')))
        const fetching = { title: `Fetching... ${Math.round(simPerc)}%` }
        return other.concat([fetching]).slice(-6)
      })
    }, 450)

  riderDataFetcher.onProgress = (p) => {
      if (!p) return
      // p can be { step, message, percent }
      if (p.message) setProgress(p.message)
      if (p.percent !== undefined && p.percent !== null) {
        setSpinnerPercent(p.percent)
        // Ensure only a single fetching step exists and update it
        setSpinnerSteps((prev) => {
          const prevSteps = Array.isArray(prev) ? prev : []
          const other = prevSteps.filter(s => !(s && s.title && s.title.startsWith('Fetching...')))
          const title = `Fetching... ${Math.round(p.percent)}%`
          return other.concat([{ title }]).slice(-6)
        })
      }
      if (p.step || p.message) {
        const title = p.message || p.step
        // Avoid appending fetching-like messages here
        if (!(title && title.startsWith && title.startsWith('Fetching...'))) {
          setSpinnerSteps((prev) => {
            const prevSteps = Array.isArray(prev) ? prev : []
            if (prevSteps.length && prevSteps[prevSteps.length - 1].title === title) return prevSteps
            const next = prevSteps.concat([{ title, detail: p.detail }])
            return next.slice(-6)
          })
        }
        // Sparse progress log
        if (p.percent && p.percent % 20 === 0) {
          remoteLog('info', 'landing_progress', { riderId: pendingRiderId, step: p.step, percent: p.percent })
        }
      }
    }

    try {
      const result = await riderDataFetcher.refreshRiderData(pendingRiderId)
      // If backend reported progress through the common onProgress mechanism, disable simulated progress
      simulated = false
      clearInterval(simInterval)
      setProgress('Live fetch complete — opening dashboard')

      // Start background poll to detect when persisted files appear. Update spinner steps while polling so
      // the user sees that we're waiting for CDN propagation.
      (async () => {
        setSpinnerSteps((prev) => prev.concat([{ title: 'Waiting for persisted files to appear on CDN...' }]).slice(-6))
        const ok = await dataService.pollForPersistedData(pendingRiderId, 3000, 10)
        if (ok) {
          setSpinnerSteps((prev) => prev.concat([{ title: 'Persisted files detected on CDN' }]).slice(-6))
          setSpinnerPercent(100)
        } else {
          setSpinnerSteps((prev) => prev.concat([{ title: 'Timed out waiting for persisted files' }]).slice(-6))
        }
      })()

      // If the fetch returned structured data, pass it through to the app so
      // the app can use it immediately (avoids relying on persisted /data files)
      if (result && typeof result === 'object') {
        remoteLog('info', 'landing_fetch_complete', { riderId: pendingRiderId })
        try {
          onRiderSelected(result)
        } catch (e) {
          remoteLog('error', 'onRiderSelected_throw', { riderId: pendingRiderId, error: String(e) })
          console.error('onRiderSelected threw for live result payload:', e, { payload: result })
          // Fallback: pass rider id to avoid breaking the app
          try { onRiderSelected(pendingRiderId) } catch (e2) { remoteLog('error', 'onRiderSelected_fallback_throw', { riderId: pendingRiderId, error: String(e2) }); console.error('Fallback onRiderSelected also failed', e2) }
        }
      } else {
        try { onRiderSelected(pendingRiderId) } catch (e) { remoteLog('error', 'onRiderSelected_fallback_throw', { riderId: pendingRiderId, error: String(e) }); console.error('onRiderSelected threw for riderId fallback', e, { riderId: pendingRiderId }) }
      }
    } catch (err) {
      setError(err.message || 'Live fetch failed')
    } finally {
      riderDataFetcher.onProgress = null
      // show final state briefly then clear spinner state
      setTimeout(() => {
        setLoading(false)
        setProgress('')
        setPendingRiderId(null)
        setSpinnerSteps([])
        setSpinnerPercent(null)
      }, 1200)
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
                      <div className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</div>
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
