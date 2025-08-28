// Data service for accessing zwift_api_client JSON data

export class DataService {
  constructor() {
    this.baseDataPath = './data/riders'
    this.cache = new Map()
  // TTL (ms) for considering persisted CDN files fresh. Default 5 minutes.
  this.persistedTtlMs = 1000 * 60 * 5
  // Optional progress callback used by the UI to receive step updates
  this.onProgress = null
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
      // Load profile first (fast-path) so UI can render immediately. Other files load in parallel.
      const profile = await this.loadRiderFile(riderId, 'profile')
      if (!profile) throw new Error(`No profile data found for rider ${riderId}`)

      // Fire progress update: profile ready
      if (this.onProgress) this.onProgress({ step: 'profile', message: 'Profile loaded' })

      const [power, races, groupRides, workouts, eventsSummary] = await Promise.all([
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


      // If server returned HTML (SPA fallback) or non-JSON, treat as missing persisted file.
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Expected JSON but received ${contentType || 'unknown'} for ${filePath} - treating as missing`)

        // If the file is missing, we prefer not to trigger a live refresh automatically.
        // Instead, expose a graceful fallback so the UI can decide whether to request a live scrape.
        // Return null to indicate missing persisted file.
        return null
      }

  const data = JSON.parse(text)
      this.cache.set(fileKey, data)
      return data
    } catch (error) {
      console.error(`Error loading file ${fileName} for rider ${riderId}:`, error)
  // In case of any error, return null so caller can decide how to proceed
  return null
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

  // Hydrate the in-memory cache from a live fetch result object returned by the backend.
  // This avoids needing persisted /data files immediately after a live scrape.
  hydrateFromLiveResult(result) {
    try {
      if (!result || typeof result !== 'object') return

      // result may be top-level profile, or { result: { profile, files } }, or { profile, files }
      const payload = result.result || result

      const profile = payload.profile || payload.profile_json || payload.profile_data || null
      const files = payload.files || payload.files_json || payload.data || {}

      // Attempt to extract rider id
      const riderId = String(payload.riderId || payload.rider_id || (profile && (profile.rider_id || profile.id)))
      if (!riderId || riderId === 'undefined' || riderId === 'null') return

      // Normalize rider object
      const normalizedProfile = profile || {}

      // Build combined rider data similar to loadRiderData
      const combined = {
        rider_id: riderId,
        ...normalizedProfile,
        power: files.power || payload.power || {},
        events: {
          races: files.races || payload.races || { count: 0, events: [] },
          group_rides: files.group_rides || payload.group_rides || { count: 0, events: [] },
          workouts: files.workouts || payload.workouts || { count: 0, events: [] },
          summary: files.events_summary || payload.events_summary || {}
        },
        intervals: (files.power && files.power.intervals) || (payload.power && payload.power.intervals) || [],
        ftp: (files.power && files.power.ftp) || (payload.power && payload.power.ftp) || normalizedProfile?.ftp || 0
      }

      // Populate top-level cache for rider
      const cacheKey = `rider-${riderId}`
      this.cache.set(cacheKey, combined)

      // Also populate per-file cache keys so loadRiderFile/loadEventData will pick them up
      const fileNames = ['profile', 'power', 'races', 'group_rides', 'workouts', 'events_summary']
      fileNames.forEach((fname) => {
        const fileKey = `file-${riderId}-${fname}`
        // prefer files[fname], then payload[fname], or derive
        let content = null
        if (files && files[fname]) content = files[fname]
        else if (payload[fname]) content = payload[fname]
        else if (fname === 'profile') content = normalizedProfile
        else if (fname === 'events_summary' && payload.events_summary) content = payload.events_summary

        if (content !== null) {
          // Normalize event file shapes so loadEventData can consume them.
          if (fname === 'races') {
            // content might be an array of races or an object
            if (Array.isArray(content)) {
              this.cache.set(fileKey, { races: content, total_races: content.length })
            } else {
              this.cache.set(fileKey, content)
            }
          } else if (fname === 'group_rides') {
            if (Array.isArray(content)) {
              this.cache.set(fileKey, { group_rides: content, total_group_rides: content.length })
            } else {
              this.cache.set(fileKey, content)
            }
          } else if (fname === 'workouts') {
            if (Array.isArray(content)) {
              this.cache.set(fileKey, { workouts: content, total_workouts: content.length })
            } else {
              this.cache.set(fileKey, content)
            }
          } else {
            this.cache.set(fileKey, content)
          }
        }
      })

      console.log(`💧 Hydrated cache for rider ${riderId} from live result`)
    } catch (e) {
      console.warn('Could not hydrate cache from live result:', e)
    }
  }

  // Poll the CDN/public /data path until persisted files appear or attempts exhausted.
  async pollForPersistedData(riderId, intervalMs = 5000, attempts = 12) {
    const profilePath = `/data/riders/${riderId}/profile.json`
    for (let i = 0; i < attempts; i++) {
      try {
        const resp = await fetch(profilePath, { method: 'GET' })
        if (resp.ok) {
          const ct = resp.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            console.log(`✅ Persisted data available for rider ${riderId} after ${i} attempts`)
            // Refresh in-memory cache from persisted files
            try {
              await this.loadRiderData(riderId)
            } catch (e) { /* ignore */ }
            return true
          }
        }
      } catch (e) { /* ignore */ }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
    console.log(`⏱️ Persisted data not found for rider ${riderId} after polling`)
    return false
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
