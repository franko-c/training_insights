import { fetchRiderLive } from './fetchRiderLive'

/**
 * Minimal DataService: wraps fetchRiderLive with in-memory caching and progress callbacks.
 */
class DataService {
  constructor() {
    this.cache = new Map()
    this.onProgress = null
  }

  /**
   * Loads rider data, fetching live on first request and caching thereafter.
   * @param {string} riderId
   * @returns {Promise<object>}
   */
  async loadRiderData(riderId) {
    this.onProgress?.({ step: 'start', message: 'Fetching rider data...' })
    if (this.cache.has(riderId)) {
      this.onProgress?.({ step: 'complete', message: 'Loaded from cache' })
      return this.cache.get(riderId)
    }
    try {
      const data = await fetchRiderLive(riderId)
      this.cache.set(riderId, data)
      this.onProgress?.({ step: 'complete', message: 'Data loaded successfully' })
      return data
    } catch (err) {
      this.onProgress?.({ step: 'error', message: err.message || 'Fetch failed' })
      throw err
    }
  }

  /**
   * Hydrates in-memory cache from an existing live fetch payload.
   * @param {object} result
   */
  hydrateFromLiveResult(result) {
    if (!result || typeof result !== 'object') return
    const payload = result.result || result
    const riderId = String(
      payload.riderId || payload.rider_id ||
      (payload.profile && (payload.profile.rider_id || payload.profile.id))
    )
    if (!riderId) return
    this.cache.set(riderId, payload)
  }

  /** Clears in-memory cache */
  clearCache() {
    this.cache.clear()
  }
}

/** Singleton instance for app-wide use */
export const dataService = new DataService()

/** Utility functions for data analysis */
export const DataAnalysis = {
  /** Calculate improvement potential based on FTP and category. */
  calculateImprovementPotential(currentFTP, category, age = 30) {
    const categoryTargets = {
      D: { next: 'C', target: 200 },
      C: { next: 'B', target: 250 },
      B: { next: 'A', target: 320 },
      A: { next: 'A+', target: 400 }
    }
    const target = categoryTargets[category]
    if (!target) return null
    return {
      nextCategory: target.next,
      powerGap: Math.max(0, target.target - currentFTP),
      achievable: (target.target - currentFTP) / currentFTP < 0.2
    }
  }
}

export default DataService
import { fetchRiderLive } from './fetchRiderLive'

/**
 * Minimal DataService: wraps fetchRiderLive with in-memory caching and progress callbacks.
 */
class DataService {
  constructor() {
    this.cache = new Map()
    this.onProgress = null
  }

  /**
   * Loads rider data, fetching live on first request and caching thereafter.
   * @param {string} riderId
   *   @returns {Promise<object>}
   */
  async loadRiderData(riderId) {
    this.onProgress?.({ step: 'start', message: 'Fetching rider data...' })
    if (this.cache.has(riderId)) {
      this.onProgress?.({ step: 'complete', message: 'Loaded from cache' })
      return this.cache.get(riderId)
    }
    try {
      const data = await fetchRiderLive(riderId)
      this.cache.set(riderId, data)
      this.onProgress?.({ step: 'complete', message: 'Data loaded successfully' })
      return data
    } catch (err) {
      this.onProgress?.({ step: 'error', message: err.message || 'Fetch failed' })
      throw err
    }
  }

  /**
   * Hydrates in-memory cache from an existing live fetch payload.
   * @param {object} result
   */
  hydrateFromLiveResult(result) {
    if (!result || typeof result !== 'object') return
    const payload = result.result || result
    const riderId = String(
      payload.riderId || payload.rider_id ||
      (payload.profile && (payload.profile.rider_id || payload.profile.id))
    )
    if (!riderId) return
    this.cache.set(riderId, payload)
  }

  /** Clears in-memory cache */
  clearCache() {
    this.cache.clear()
  }
}

/** Singleton instance for app-wide use */
export const dataService = new DataService()

/** Utility functions for data analysis */
export const DataAnalysis = {
  /**
   * Calculate improvement potential based on FTP and category.
   * @param {number} currentFTP
   * @param {string} category
   * @param {number} age
   * @returns {{nextCategory: string, powerGap: number, achievable: boolean} | null}
   */
  calculateImprovementPotential(currentFTP, category, age = 30) {
    const categoryTargets = {
      D: { next: 'C', target: 200 },
      C: { next: 'B', target: 250 },
      B: { next: 'A', target: 320 },
      A: { next: 'A+', target: 400 }
    }
    const target = categoryTargets[category]
    if (!target) return null
    return {
      nextCategory: target.next,
      powerGap: Math.max(0, target.target - currentFTP),
      achievable: (target.target - currentFTP) / currentFTP < 0.2
    }
  }
}

export default DataService
import { fetchRiderLive } from './fetchRiderLive'

/**
 * Minimal DataService: wraps fetchRiderLive with in-memory caching and progress callbacks.
 */
class DataService {
  constructor() {
    this.cache = new Map()
    this.onProgress = null
  }

  /**
   * Loads rider data, fetching live on first request and caching thereafter.
   * @param {string} riderId
   * @returns {Promise<object>}
   */
  async loadRiderData(riderId) {
    this.onProgress?.({ step: 'start', message: 'Fetching rider data...' })
    if (this.cache.has(riderId)) {
      this.onProgress?.({ step: 'complete', message: 'Loaded from cache' })
      return this.cache.get(riderId)
    }
    try {
      const data = await fetchRiderLive(riderId)
      this.cache.set(riderId, data)
      this.onProgress?.({ step: 'complete', message: 'Data loaded successfully' })
      return data
    } catch (err) {
      this.onProgress?.({ step: 'error', message: err.message || 'Fetch failed' })
      throw err
    }
  }

  /**
   * Hydrates in-memory cache from an existing live fetch payload.
   * @param {object} result
   */
  hydrateFromLiveResult(result) {
    if (!result || typeof result !== 'object') return
    const payload = result.result || result
    const riderId = String(
      payload.riderId || payload.rider_id ||
      (payload.profile && (payload.profile.rider_id || payload.profile.id))
    )
    if (!riderId) return
    this.cache.set(riderId, payload)
  }

  /** Clears in-memory cache */
  clearCache() {
    this.cache.clear()
  }
}

/** Singleton instance for app-wide use */
export const dataService = new DataService()

/** Utility functions for data analysis */
export const DataAnalysis = {
  /**
   * Calculate improvement potential based on FTP and category.
   * @param {number} currentFTP
   * @param {string} category
   * @param {number} age
   * @returns {{nextCategory: string, powerGap: number, achievable: boolean} | null}
   */
  calculateImprovementPotential(currentFTP, category, age = 30) {
    const categoryTargets = {
      D: { next: 'C', target: 200 },
      C: { next: 'B', target: 250 },
      B: { next: 'A', target: 320 },
      A: { next: 'A+', target: 400 }
    }
    const target = categoryTargets[category]
    if (!target) return null
    return {
      nextCategory: target.next,
      powerGap: Math.max(0, target.target - currentFTP),
      achievable: (target.target - currentFTP) / currentFTP < 0.2
    }
  }
}

export default DataService
          const categoryTargets = {
