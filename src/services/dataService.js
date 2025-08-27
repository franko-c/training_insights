// Data service for accessing zwift_api_client JSON data

export class DataService {
  constructor() {
    this.baseDataPath = './data/riders'
    this.cache = new Map()
  }

  // Clear cache - useful for debugging
  clearCache() {
    console.log('🗑️ Clearing data service cache')
    this.cache.clear()
  }

  // Load complete rider data from new zwift_api_client format
  async loadRiderData(riderId) {
    const cacheKey = `rider-${riderId}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      // Load all rider data files in parallel
      const [profile, power, races, groupRides, workouts, eventsSummary] = await Promise.all([
        this.loadRiderFile(riderId, 'profile'),
        this.loadRiderFile(riderId, 'power'),
        this.loadRiderFile(riderId, 'races'),
        this.loadRiderFile(riderId, 'group_rides'),
        this.loadRiderFile(riderId, 'workouts'),
        this.loadRiderFile(riderId, 'events_summary')
      ])

      if (!profile) {
        throw new Error(`No profile data found for rider ${riderId}`)
      }

      // Combine all data into unified structure
      const data = {
        rider_id: riderId,
        ...profile,
        power: power || {},
        events: {
          races: races || { count: 0, events: [] },
          group_rides: groupRides || { count: 0, events: [] },
          workouts: workouts || { count: 0, events: [] },
          summary: eventsSummary || {}
        },
        // Ensure compatibility with existing UI
        intervals: power?.intervals || [],
        ftp: power?.ftp || profile?.ftp || 0
      }

      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Error loading rider ${riderId}:`, error)
      throw error
    }
  }

  // Load individual rider data file
  async loadRiderFile(riderId, fileName) {
    const fileKey = `file-${riderId}-${fileName}`
    if (this.cache.has(fileKey)) {
      return this.cache.get(fileKey)
    }

    try {
      // Use the public directory path for now (until we implement true self-containment)
      const filePath = `/data/riders/${riderId}/${fileName}.json`
      console.log(`Attempting to load: ${filePath}`)
      const response = await fetch(filePath)
      
      if (!response.ok) {
        console.error(`HTTP Error ${response.status} for ${filePath}`)
        throw new Error(`Failed to load ${fileName}: ${response.status}`)
      }
      
      // Check content type
      const contentType = response.headers.get('content-type')
      console.log(`Content-Type for ${filePath}: ${contentType}`)

      const text = await response.text()
      console.log(`Response text preview for ${filePath}:`, text.substring(0, 100))

      // If server returned HTML (likely index.html due to SPA fallback), treat as missing file
      if (contentType && contentType.includes('text/html')) {
        console.error(`Expected JSON but received HTML for ${filePath} - treating as missing`)

        // Prefer calling the Railway backend directly when configured. This avoids Netlify
        // function timeouts in branch previews and removes the proxy from the critical path.
        const railwayUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_RAILWAY_URL) || (typeof window !== 'undefined' && window.RAILWAY_URL)

        if (railwayUrl) {
          try {
            console.log(`Attempting direct Railway fetch for rider ${riderId} at ${railwayUrl}`)
            const url = `${railwayUrl.replace(/\/$/, '')}/fetch-rider/${encodeURIComponent(riderId)}?force_refresh=true`
            const r = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
            if (!r.ok) {
              console.error(`Railway returned ${r.status} for rider ${riderId}`)
              throw new Error(`Railway fetch failed: ${r.status}`)
            }
            const payload = await r.json()

            // payload may contain top-level `profile` or `result.profile`.
            if (payload && payload.profile) {
              this.cache.set(fileKey, payload.profile)
              return payload.profile
            }
            if (payload && payload.result && typeof payload.result === 'object' && payload.result.profile) {
              this.cache.set(fileKey, payload.result.profile)
              return payload.result.profile
            }
            // If Railway returned a mapping of files under `result.files` (rare), use it.
            if (payload && payload.result && payload.result.files && payload.result.files[fileName + '.json']) {
              const parsed = payload.result.files[fileName + '.json']
              this.cache.set(fileKey, parsed)
              return parsed
            }

            throw new Error('Railway returned unexpected payload shape')
          } catch (err) {
            console.error(`Direct Railway fetch failed for rider ${riderId}:`, err)
            // Fall through to Netlify function fallback below
          }
        }

        // Fallback: Attempt to trigger live fetch via Netlify function and return that result to the UI.
        try {
          console.log(`Attempting live fetch via Netlify function for rider ${riderId}`)
          const funcResp = await fetch('/.netlify/functions/fetch-rider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ riderId: String(riderId), force_refresh: true })
          })

          if (!funcResp.ok) {
            console.error(`Netlify function returned ${funcResp.status} when fetching rider ${riderId}`)
            throw new Error(`Missing JSON file ${filePath} and live fetch failed (${funcResp.status})`)
          }

          const payload = await funcResp.json()

          // Prefer top-level profile
          if (payload && payload.profile) {
            this.cache.set(fileKey, payload.profile)
            return payload.profile
          }

          // Then look under result.profile
          if (payload && payload.result && typeof payload.result === 'object' && payload.result.profile) {
            this.cache.set(fileKey, payload.result.profile)
            return payload.result.profile
          }

          // If the function returned a map of files under result.files
          if (payload && payload.result && payload.result.files && payload.result.files[fileName + '.json']) {
            const parsed = payload.result.files[fileName + '.json']
            this.cache.set(fileKey, parsed)
            return parsed
          }

          if (payload && payload.success && payload.fallback && payload.profile && fileName === 'profile') {
            this.cache.set(fileKey, payload.profile)
            return payload.profile
          }

          throw new Error(`Live fetch returned unexpected payload: ${JSON.stringify(payload).substring(0,200)}`)
        } catch (err) {
          console.error(`Live fetch attempt failed for rider ${riderId}:`, err)
          throw err
        }
      }

      const data = JSON.parse(text)
      this.cache.set(fileKey, data)
      return data
    } catch (error) {
      console.error(`Error loading file ${fileName} for rider ${riderId}:`, error)
      throw error
    }
  }

  // Load specific event type data
  async loadEventData(riderId, eventType) {
    const cacheKey = `events-${riderId}-${eventType}`
    console.log(`🔄 Loading event data for ${eventType}, cache key: ${cacheKey}`)
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      console.log(`✅ Using cached data for ${eventType}:`, cached.count, 'events')
      return cached
    }

    try {
      const data = await this.loadRiderFile(riderId, eventType)
      console.log(`📂 Raw file data for ${eventType}:`, Object.keys(data))
      
      if (data) {
        // Handle the actual data format from zwift_api_client
        let eventData = {
          count: 0,
          events: []
        }
        
        if (eventType === 'races' && data.races) {
          eventData = {
            count: data.total_races || data.races.length,
            events: data.races,
            latest_date: data.latest_race_date
          }
          console.log(`🏁 Processed races data: ${eventData.count} events`)
        } else if (eventType === 'group_rides' && data.group_rides) {
          eventData = {
            count: data.total_group_rides || data.group_rides.length,
            events: data.group_rides,
            latest_date: data.latest_ride_date  // Note: latest_ride_date, not latest_group_ride_date
          }
          console.log(`🚴 Processed group_rides data: ${eventData.count} events`)
        } else if (eventType === 'workouts' && data.workouts) {
          eventData = {
            count: data.total_workouts || data.workouts.length,
            events: data.workouts,
            latest_date: data.latest_workout_date
          }
          console.log(`💪 Processed workouts data: ${eventData.count} events`)
        } else {
          console.log(`❌ No matching field found for ${eventType} in data:`, Object.keys(data))
        }
        
        this.cache.set(cacheKey, eventData)
        console.log(`💾 Cached ${eventType} data: ${eventData.count} events`)
        return eventData
      }
      return { count: 0, events: [] }
    } catch (error) {
      console.error(`Error loading ${eventType} for rider ${riderId}:`, error)
      return { count: 0, events: [] }
    }
  }

  // Get events summary
  async loadEventsSummary(riderId) {
    return await this.loadRiderFile(riderId, 'events_summary')
  }

  // Get available rider IDs
  async getAvailableRiders() {
    try {
      // For now, return known rider IDs - could be expanded to read directory
      return ['5528916'] // Fran Cardona
    } catch (error) {
      console.error('Error listing riders:', error)
      return []
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
  }

  // Get cached data
  getCachedData(riderId) {
    return this.cache.get(`rider-${riderId}`)
  }

  // Get event type counts for a rider
  async getEventCounts(riderId) {
    const summary = await this.loadEventsSummary(riderId)
    if (summary) {
      return {
        races: summary.summary?.races?.count || 0,
        group_rides: summary.summary?.group_rides?.count || 0,
        workouts: summary.summary?.workouts?.count || 0,
        total: summary.total_events || 0
      }
    }
    return { races: 0, group_rides: 0, workouts: 0, total: 0 }
  }
}

// Create singleton instance
export const dataService = new DataService()

// Make dataService globally accessible for debugging
if (typeof window !== 'undefined') {
  window.dataService = dataService;
}

// Utility functions for data analysis
export const DataAnalysis = {
  
  // Calculate improvement potential - KEEP: used by InsightsPanel
  calculateImprovementPotential(currentFTP, category, age = 30) {
    const categoryTargets = {
      'D': { next: 'C', target: 200 },
      'C': { next: 'B', target: 250 },
      'B': { next: 'A', target: 320 },
      'A': { next: 'A+', target: 400 }
    }

    const target = categoryTargets[category]
    if (!target) return null

    return {
      nextCategory: target.next,
      powerGap: Math.max(0, target.target - currentFTP),
      achievable: (target.target - currentFTP) / currentFTP < 0.2 // 20% improvement is realistic
    }
  }
}

export default DataService
