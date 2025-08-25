/**
 * Rider Data Fetching Service
 * Interfaces with the Python zwift_api_client to fetch and manage rider data
 */

export class RiderDataFetcher {
  constructor() {
  // API endpoints
  this.netlifyApiPath = '/api'
  this.railwayApiBase = 'https://zwiftervals-production.up.railway.app'
  }

  /**
   * Check if rider data exists locally
   */
  async hasRiderData(riderId) {
    try {
      const response = await fetch(`/data/riders/${riderId}/profile.json`)
      return response.ok
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
      // Try Railway API first
      const response = await fetch(`${this.railwayApiBase}/fetch-rider/${riderId}`)
      if (response.ok) {
        const result = await response.json()
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
      // Try Railway API first
      const response = await fetch(`${this.railwayApiBase}/fetch-rider/${riderId}?force_refresh=true`)
      if (response.ok) {
        const result = await response.json()
        if (result.success !== false) {
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
        if (result.success) {
          return result
        }
        throw new Error(result.error || 'Netlify refresh failed')
      }
      throw new Error('REFRESH_API_NOT_AVAILABLE')
    } catch (error) {
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
