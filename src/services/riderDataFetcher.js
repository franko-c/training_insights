/**
 * Rider Data Fetching Service
 * Interfaces with the Python zwift_api_client to fetch and manage rider data
 */

export class RiderDataFetcher {
  constructor() {
    // Use localhost:5000 for the Python API server
    this.baseApiPath = '/api'
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
      // First attempt: try the API endpoint if it exists
      const response = await fetch(`${this.baseApiPath}/fetch-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          riderId: riderId,
          force_refresh: false
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          return result
        }
        throw new Error(result.error || 'API call failed')
      }

      // If API endpoint doesn't exist, throw instructional error
      throw new Error('API_NOT_AVAILABLE')

    } catch (error) {
      if (error.message === 'API_NOT_AVAILABLE' || error.name === 'TypeError') {
        // Provide manual instructions since backend API isn't set up
        throw new Error(
          `API endpoint not available. The fetch-rider function should handle new rider requests automatically.`
        )
      }
      throw error
    }
  }

  /**
   * Refresh existing rider data
   */
  async refreshRiderData(riderId) {
    try {
      // Use the same fetch-rider endpoint but with force_refresh: true
      const response = await fetch(`${this.baseApiPath}/fetch-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          riderId: riderId,
          force_refresh: true 
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          return result
        }
        throw new Error(result.error || 'Refresh failed')
      }

      throw new Error('REFRESH_API_NOT_AVAILABLE')

    } catch (error) {
      if (error.message === 'REFRESH_API_NOT_AVAILABLE' || error.name === 'TypeError') {
        throw new Error(
          `API endpoint not available. The fetch-rider function should handle refresh requests.`
        )
      }
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
