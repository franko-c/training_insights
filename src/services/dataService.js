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

  // Call restore when module instantiates the singleton
  // (we'll invoke this from the exported singleton initializer)

  // Restore any hydrated rider data from sessionStorage (useful during testing)
  _restoreFromSession() {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    try {
      const idsJson = sessionStorage.getItem('hydrated-rider-ids')
      if (!idsJson) return
      const ids = JSON.parse(idsJson)
      if (!Array.isArray(ids)) return
      ids.forEach((riderId) => {
        try {
          const key = `hydrated-rider-${riderId}`
          const item = sessionStorage.getItem(key)
          if (!item) return
          const combined = JSON.parse(item)
          // Populate rider cache and per-file keys
          this.cache.set(`rider-${riderId}`, combined)
          this.cache.set(`file-${riderId}-profile`, combined)
          if (combined.power) this.cache.set(`file-${riderId}-power`, combined.power)
          if (combined.events && combined.events.races) this.cache.set(`file-${riderId}-races`, combined.events.races)
          if (combined.events && combined.events.group_rides) this.cache.set(`file-${riderId}-group_rides`, combined.events.group_rides)
          if (combined.events && combined.events.workouts) this.cache.set(`file-${riderId}-workouts`, combined.events.workouts)
          if (combined.events && combined.events.summary) this.cache.set(`file-${riderId}-events_summary`, combined.events.summary)
          console.log(`♻️ Restored hydrated rider ${riderId} from sessionStorage`)
        } catch (e) { /* ignore per-item errors */ }
      })
    } catch (e) {
      console.warn('Could not restore hydrated riders from sessionStorage', e)
    }
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
      
      // Check content type and read text body
      const contentType = response.headers.get('content-type')
      console.log(`Content-Type for ${filePath}: ${contentType}`)

      const text = await response.text()
      console.log(`Response text preview for ${filePath}:`, text.substring(0, 200))

      // Try to parse the response as JSON even if the content-type is not strictly application/json.
      // GitHub raw files often return text/plain; charset=utf-8 but contain valid JSON.
      let data = null
      try {
        data = JSON.parse(text)
      } catch (parseErr) {
        // If the response looks like HTML, treat it as the SPA fallback and consider the file missing.
          const looksLikeHtml = /<\/?html|<!doctype/i.test(text)
          if (looksLikeHtml) {
            const reqId = Math.random().toString(36).slice(2, 9)
            console.warn(`Received HTML fallback for ${filePath}; treating as missing persisted file`, { requestId: reqId, ts: new Date().toISOString(), preview: text.substring(0, 512) })

            // Try a safe backend fallback once: ask the Netlify function to provide the live payload
            // without forcing a refresh. This helps in cases where the static file isn't published yet
            // but the backend can return the generated payload directly.
            try {
              if (typeof window !== 'undefined') {
                console.log(`Attempting backend fallback for rider ${riderId}`)
                const resp = await fetch('/api/fetch-rider', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ riderId: riderId, force_refresh: false })
                })
                if (resp && resp.ok) {
                  const json = await resp.json()
                  // hydrate cache if payload present
                  if (json) {
                    try {
                      this.hydrateFromLiveResult(json)
                    } catch (e) { /* ignore hydration failures */ }

                    // If hydration populated the requested file, return it
                    if (this.cache.has(fileKey)) {
                      return this.cache.get(fileKey)
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('Backend fallback failed or not available', e)
            }

            return null
          }

        // If content-type explicitly indicates JSON but parsing failed, log and treat as missing
        if (contentType && contentType.includes('application/json')) {
          console.error(`Content-Type is application/json but parsing failed for ${filePath}:`, parseErr)
          return null
        }

        // Otherwise, it's likely a plain-text JSON (e.g. GitHub raw) but parsing still failed.
        console.warn(`Could not parse response body for ${filePath}; treating as missing`)
        return null
      }

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
      if (!data) {
        console.log(`📂 No persisted ${eventType} file for rider ${riderId}`)
        return { count: 0, events: [] }
      }
      // Normalization: accept several common persisted file shapes.
      // 1) Top-level array (e.g. [ { ... }, ... ]) -> normalize into { <eventKey>: [...], total_<eventKey>: N }
      // 2) { events: [...] } -> treat events as the array for the specific event type
      // 3) If the persisted file uses a different pluralization, attempt to coerce it.
      try {
        if (Array.isArray(data)) {
          if (eventType === 'races') {
            data = { races: data, total_races: data.length }
          } else if (eventType === 'group_rides') {
            data = { group_rides: data, total_group_rides: data.length }
          } else if (eventType === 'workouts') {
            data = { workouts: data, total_workouts: data.length }
          }
        } else if (data && typeof data === 'object') {
          // If it's an object with a generic `events` array, map it to the specific event key
          if (Array.isArray(data.events)) {
            if (eventType === 'races') data = { races: data.events, total_races: data.events.length }
            if (eventType === 'group_rides') data = { group_rides: data.events, total_group_rides: data.events.length }
            if (eventType === 'workouts') data = { workouts: data.events, total_workouts: data.events.length }
          }
          // If the object contains a top-level array under unexpected key names, try to detect them
          const altKeys = ['items', 'rows', 'results', 'data']
          for (const k of altKeys) {
            if (Array.isArray(data[k])) {
              if (eventType === 'races') data = { races: data[k], total_races: data[k].length }
              if (eventType === 'group_rides') data = { group_rides: data[k], total_group_rides: data[k].length }
              if (eventType === 'workouts') data = { workouts: data[k], total_workouts: data[k].length }
              break
            }
          }
        }
      } catch (normErr) {
        console.warn('Event data normalization failed, proceeding with raw data shape', normErr)
      }
      try {
        const rawKeys = (data && typeof data === 'object') ? Object.keys(data) : null
        console.log(`📂 Raw file data for ${eventType}:`, rawKeys === null ? `non-object(${typeof data})` : rawKeys)
      } catch (e) {
        console.log(`📂 Raw file data for ${eventType} is not an object; type=${typeof data}`)
      }
      
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
          try {
            const rawKeys = (data && typeof data === 'object') ? Object.keys(data) : null
            console.log(`❌ No matching field found for ${eventType} in data:`, rawKeys === null ? `non-object(${typeof data})` : rawKeys)
          } catch (e) {
            console.log(`❌ No matching field found for ${eventType} - unexpected shape`, data)
          }
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
      // files may be an object or an array of { filename, content } entries; accept many aliases
      let files = payload.files || payload.files_json || payload.data || payload.file_map || payload.files_map || {}
      // If files is a JSON string, try parsing
      if (typeof files === 'string') {
        try { files = JSON.parse(files) } catch (e) { /* ignore */ }
      }

      // Attempt to extract rider id
  const riderId = String(payload.riderId || payload.rider_id || payload.id || (profile && (profile.rider_id || profile.id)))
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

      // Helper: pull a candidate content value for a logical file name from various payload shapes
      const resolveContent = (fname) => {
        // direct in files object (common)
        if (files && typeof files === 'object' && !Array.isArray(files)) {
          if (files[fname]) return files[fname]
          if (files[`${fname}.json`]) return files[`${fname}.json`]
          if (files[`${fname}_json`]) return files[`${fname}_json`]
        }

        // payload top-level variants
        if (payload[fname]) return payload[fname]
        if (payload[`${fname}.json`]) return payload[`${fname}.json`]
        if (payload[`${fname}_json`]) return payload[`${fname}_json`]

        // Sometimes events are under payload.events.{races|group_rides|workouts}
        if (payload.events && payload.events[fname]) return payload.events[fname]

        // Some servers return a flat 'races' array at payload.races_list or payload.events_list
        if (fname === 'races' && Array.isArray(payload.races_list)) return payload.races_list
        if (fname === 'group_rides' && Array.isArray(payload.group_rides_list)) return payload.group_rides_list
        if (fname === 'workouts' && Array.isArray(payload.workouts_list)) return payload.workouts_list

        // If files is an array of entries like { filename, json } or { name, content }
        if (Array.isArray(files)) {
          for (const item of files) {
            if (!item) continue
            const name = item.filename || item.name || item.path || item.key || ''
            const lc = String(name).toLowerCase()
            if (lc.includes(fname)) {
              if (item.json) return item.json
              if (item.content) return item.content
              if (item.data) return item.data
              if (item.body) return item.body
            }
          }
        }

        // Nothing found
        return null
      }

      fileNames.forEach((fname) => {
        const fileKey = `file-${riderId}-${fname}`
        let content = resolveContent(fname)

        // If not found but payload contains arrays under top-level keys named after the plural event type
        if (!content) {
          if (fname === 'races' && Array.isArray(payload.races)) content = payload.races
          if (fname === 'group_rides' && Array.isArray(payload.group_rides)) content = payload.group_rides
          if (fname === 'workouts' && Array.isArray(payload.workouts)) content = payload.workouts
        }

        if (content !== null && content !== undefined) {
          // Normalize event file shapes so loadEventData can consume them.
          const ensureArrayShape = (arr, keyName) => {
            if (Array.isArray(arr)) {
              const obj = {}
              obj[keyName] = arr
              obj[`total_${keyName}`] = arr.length
              return obj
            }
            if (arr && typeof arr === 'object') return arr
            return { [keyName]: [], [`total_${keyName}`]: 0 }
          }

          if (fname === 'races') {
            // Accept shapes: Array, { races: [...] }, { count/events }, payload.events.races.events
            if (Array.isArray(content)) {
              this.cache.set(fileKey, ensureArrayShape(content, 'races'))
            } else if (content.races || content.total_races || content.events) {
              // If content.events exists, normalize to races
              if (content.events && Array.isArray(content.events)) {
                this.cache.set(fileKey, { races: content.events, total_races: content.events.length, latest_race_date: content.latest_date || content.latest_race_date || null })
              } else {
                this.cache.set(fileKey, content)
              }
            } else {
              this.cache.set(fileKey, ensureArrayShape(content, 'races'))
            }
          } else if (fname === 'group_rides') {
            if (Array.isArray(content)) {
              this.cache.set(fileKey, ensureArrayShape(content, 'group_rides'))
            } else if (content.group_rides || content.total_group_rides || content.events) {
              if (content.events && Array.isArray(content.events)) {
                this.cache.set(fileKey, { group_rides: content.events, total_group_rides: content.events.length, latest_ride_date: content.latest_date || null })
              } else {
                this.cache.set(fileKey, content)
              }
            } else {
              this.cache.set(fileKey, ensureArrayShape(content, 'group_rides'))
            }
          } else if (fname === 'workouts') {
            if (Array.isArray(content)) {
              this.cache.set(fileKey, ensureArrayShape(content, 'workouts'))
            } else if (content.workouts || content.total_workouts || content.events) {
              if (content.events && Array.isArray(content.events)) {
                this.cache.set(fileKey, { workouts: content.events, total_workouts: content.events.length, latest_workout_date: content.latest_date || null })
              } else {
                this.cache.set(fileKey, content)
              }
            } else {
              this.cache.set(fileKey, ensureArrayShape(content, 'workouts'))
            }
          } else {
            this.cache.set(fileKey, content)
          }
        }
      })

      console.log(`💧 Hydrated cache for rider ${riderId} from live result`)
      // Persist hydrated combined object to sessionStorage so it survives a refresh during testing
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const key = `hydrated-rider-${riderId}`
          sessionStorage.setItem(key, JSON.stringify(combined))
          // maintain index of hydrated rider ids
          const idxKey = 'hydrated-rider-ids'
          try {
            const existing = JSON.parse(sessionStorage.getItem(idxKey) || '[]')
            if (!existing.includes(riderId)) existing.push(riderId)
            sessionStorage.setItem(idxKey, JSON.stringify(existing))
          } catch (e) {
            sessionStorage.setItem(idxKey, JSON.stringify([riderId]))
          }
        }
      } catch (e) {
        /* ignore sessionStorage failures */
      }
    } catch (e) {
      console.warn('Could not hydrate cache from live result:', e)
    }
  }

  // Poll the CDN/public /data path until persisted files appear or attempts exhausted.
  // Poll until a set of critical files exists. Uses exponential backoff by default.
  async pollForMultiplePersistedFiles(riderId, files = ['profile.json','events_summary.json','races.json'],
    initialIntervalMs = 3000, maxAttempts = 8) {
    const targetBase = `/data/riders/${riderId}`
    let attempt = 0
    let interval = initialIntervalMs

    const checkOnce = async () => {
      try {
        // HEAD each file to minimize bandwidth
        for (const f of files) {
          const url = `${targetBase}/${f}`
          try {
            const resp = await fetch(url, { method: 'HEAD' })
            if (!resp.ok) return false
            const ct = (resp.headers.get('content-type') || '')
            // Accept application/json or text/plain (GitHub raw returns text/plain but contains JSON)
            if (!(ct.includes('application/json') || ct.includes('text/plain'))) return false
          } catch (e) {
            return false
          }
        }
        return true
      } catch (e) {
        return false
      }
    }

    while (attempt < maxAttempts) {
      const ok = await checkOnce()
      if (ok) {
        console.log(`✅ Persisted files present for rider ${riderId} after ${attempt} attempts`)
        try { await this.loadRiderData(riderId) } catch (e) { /* ignore */ }
        return true
      }
      // Exponential backoff with jitter
      await new Promise((r) => setTimeout(r, interval + Math.floor(Math.random() * 1000)))
      interval = Math.min(interval * 2, 20000)
      attempt += 1
    }

    console.log(`⏱️ Persisted critical files not found for rider ${riderId} after polling`)
    return false
  }

  // Backwards-compatible alias that polls just for profile with the old signature
  async pollForPersistedData(riderId, intervalMs = 5000, attempts = 12) {
    // Use multiple-files poll but make it quick: fewer attempts and smaller interval
    return await this.pollForMultiplePersistedFiles(riderId, ['profile.json','events_summary.json','races.json'], Math.max(1000, intervalMs), Math.min(10, attempts))
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

// Attempt to restore any hydrated data from sessionStorage (browser only)
try {
  if (typeof window !== 'undefined' && dataService && typeof dataService._restoreFromSession === 'function') {
    dataService._restoreFromSession()
  }
} catch (e) { /* ignore */ }

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
