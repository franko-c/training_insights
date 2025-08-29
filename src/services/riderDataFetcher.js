/**
 * Rider Data Fetching Service
 * Interfaces with the Python zwift_api_client to fetch and manage rider data
 */
import { remoteLog } from '../utils/logger'

export class RiderDataFetcher {
  constructor() {
  // API endpoints
  this.netlifyApiPath = '/api'
  this.railwayApiBase = 'https://zwiftervals-production.up.railway.app'
  // Optional progress callback set by UI
  this.onProgress = null
  }

  /**
   * Check if rider data exists locally
   */
  async hasRiderData(riderId) {
    try {
      const response = await fetch(`/data/riders/${riderId}/profile.json`, { method: 'GET' })
      if (!response.ok) return false

      const contentType = response.headers.get('content-type') || ''
      // If the server returned HTML (SPA fallback) treat as missing
      if (contentType.includes('text/html')) {
        console.warn(`hasRiderData: received HTML for /data/riders/${riderId}/profile.json - treating as missing`) 
        return false
      }

      // Prefer explicit JSON content-type; attempt to parse as a final safeguard
      if (contentType.includes('application/json')) {
        try {
          const json = await response.json()
          return !!json
        } catch (err) {
          console.warn('hasRiderData: JSON parse failed, treating as missing', err)
          return false
        }
      }

      // Unknown content-type: attempt to parse as JSON (GitHub raw often returns text/plain)
      try {
        const text = await response.text()
        JSON.parse(text)
        return true
      } catch (e) {
        return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Fetch rider data using the Python zwift_api_client
   * This would typically call a backend endpoint that runs the Python CLI
   */
  async fetchRiderData(riderId) {
    try {
  // Try Railway API first (do not force refresh by default)
  if (this.onProgress) this.onProgress({ step: 'start', message: 'Attempting cached or fast fetch' })
  try { remoteLog && remoteLog('info', 'fetch_attempt', { riderId }) } catch(e){}
  const response = await fetch(`${this.railwayApiBase}/fetch-rider/${riderId}`)
      if (response.ok) {
        const result = await response.json()
        if (this.onProgress) this.onProgress({ step: 'railway', message: 'Railway returned data' })
        try { remoteLog && remoteLog('info', 'railway_returned', { riderId }) } catch(e){}
        if (result.success !== false) {
          return result
        }
        throw new Error(result.error || 'Railway API call failed')
      }
      // Fallback to Netlify if Railway fails
      const netlifyResponse = await fetch(`${this.netlifyApiPath}/fetch-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          riderId: riderId,
          force_refresh: false
        })
      })
      if (netlifyResponse.ok) {
        const result = await netlifyResponse.json()
        try { remoteLog && remoteLog('info', 'netlify_returned', { riderId }) } catch(e){}
        if (result.success) {
          return result
        }
        throw new Error(result.error || 'Netlify API call failed')
      }
      throw new Error('API_NOT_AVAILABLE')
    } catch (error) {
      throw error
    }
  }

  /**
   * Refresh existing rider data
   */
  async refreshRiderData(riderId) {
    try {
  // Try Railway API first and explicitly request a forced refresh
  if (this.onProgress) this.onProgress({ step: 'start', message: 'Requesting live refresh', percent: 5 })
  if (this.onProgress) this.onProgress({ step: 'contacting_railway', message: 'Contacting backend service', percent: 10 })
  try { remoteLog && remoteLog('info', 'refresh_request', { riderId }) } catch(e){}
  const response = await fetch(`${this.railwayApiBase}/fetch-rider/${riderId}?force_refresh=true`)
      if (response.ok) {
        if (this.onProgress) this.onProgress({ step: 'railway_received', message: 'Railway acknowledged request', percent: 30 })
        const result = await response.json()
        // Simulate scraping progress if result includes a `progress` field
        if (result && result.progress && this.onProgress) {
          // result.progress may be an array of { step, percent }
          try {
            for (const p of result.progress) {
              this.onProgress({ step: p.step || 'railway', message: p.message || p.step, percent: p.percent })
            }
          } catch (e) { /* ignore */ }
        }
  if (this.onProgress) this.onProgress({ step: 'railway_completed', message: 'Railway returned data', percent: 80 })
  try { remoteLog && remoteLog('info', 'railway_completed', { riderId }) } catch(e){}
        if (result.success !== false) {
          if (this.onProgress) this.onProgress({ step: 'done', message: 'Live refresh complete', percent: 100 })
          return result
        }
        throw new Error(result.error || 'Railway refresh failed')
      }
      // Fallback to Netlify if Railway fails
      const netlifyResponse = await fetch(`${this.netlifyApiPath}/fetch-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          riderId: riderId,
          force_refresh: true 
        })
      })
      if (netlifyResponse.ok) {
        const result = await netlifyResponse.json()
  if (this.onProgress) this.onProgress({ step: 'netlify', message: 'Netlify function returned data', percent: 90 })
  try { remoteLog && remoteLog('info', 'netlify_function_returned', { riderId }) } catch(e){}
        if (result.success) {
          if (this.onProgress) this.onProgress({ step: 'done', message: 'Live refresh complete', percent: 100 })
          return result
        }
        throw new Error(result.error || 'Netlify refresh failed')
      }
  throw new Error('REFRESH_API_NOT_AVAILABLE')
    } catch (error) {
  try { remoteLog && remoteLog('error', 'refresh_failed', { riderId, error: String(error) }) } catch(e){}
      throw error
    }
  }

  /**
   * Get list of available riders
   */
  async getAvailableRiders() {
    try {
      // Try to read the riders directory
      const response = await fetch('/data/riders/')
      if (response.ok) {
        // This would need backend support to list directories
        // For now, return known riders
        return ['5528916']
      }
      return []
    } catch (error) {
      console.warn('Could not list available riders:', error)
      return []
    }
  }

  /**
   * Validate rider ID format
   */
  validateRiderId(riderId) {
    const cleaned = riderId.toString().trim()
    
    if (!cleaned) {
      return { valid: false, error: 'Rider ID is required' }
    }
    
    if (!/^\d+$/.test(cleaned)) {
      return { valid: false, error: 'Rider ID must contain only numbers' }
    }
    
    if (cleaned.length < 6 || cleaned.length > 8) {
      return { valid: false, error: 'Rider ID should be 6-8 digits long' }
    }
    
    return { valid: true, riderId: cleaned }
  }

}

// Create singleton instance
export const riderDataFetcher = new RiderDataFetcher()

// Make it globally accessible for debugging
if (typeof window !== 'undefined') {
  window.riderDataFetcher = riderDataFetcher
}

export default RiderDataFetcher
