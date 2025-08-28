import { describe, it, expect } from 'vitest'
import DataService from '../dataService'

describe('DataService normalization', () => {
  it('normalizes top-level array for races', async () => {
    const svc = new DataService()
    // simulate array persisted file shape
    const arr = [{ id: 1 }, { id: 2 }]
    // call normalization via private path: reuse loadEventData behavior by stubbing loadRiderFile
    svc.loadRiderFile = async () => arr
    const result = await svc.loadEventData('test', 'races')
    expect(result.count).toBe(2)
    expect(Array.isArray(result.events)).toBe(true)
    expect(result.events.length).toBe(2)
  })

  it('normalizes { events: [] } shape for group_rides', async () => {
    const svc = new DataService()
    svc.loadRiderFile = async () => ({ events: [{ a: 1 }] })
    const result = await svc.loadEventData('test', 'group_rides')
    expect(result.count).toBe(1)
    expect(Array.isArray(result.events)).toBe(true)
  })
})
