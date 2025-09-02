// Simple live fetch for rider data via Netlify Functions proxy
export async function fetchRiderLive(riderId) {
  if (import.meta.env.DEV) {
    // Dev fallback: load static sample profile to unblock UI
    try {
      const sample = await fetch(`/data/riders/${riderId}/profile.json`).then(r => r.json());
      return {
        rider_id: riderId,
        ...sample,
        power: {},
        events: {
          races: { races: [], total_races: 0, latest_race_date: null },
          group_rides: { group_rides: [], total_group_rides: 0, latest_ride_date: null },
          workouts: { workouts: [], total_workouts: 0, latest_workout_date: null },
          summary: {}
        },
        intervals: [],
        ftp: sample.ftp || 0
      };
    } catch (e) {
      console.warn('Dev sample load failed', e);
    }
  }
  // Production: proxy via Netlify Function
  // Directly call the API backend (no Netlify Functions)
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const url = `${API_BASE.replace(/\/+$/,'')}/fetch-rider/${encodeURIComponent(riderId)}?force_refresh=false`;
  const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
  if (!resp.ok) {
    throw new Error(`Fetch live rider data failed: HTTP ${resp.status}`);
  }
  const result = await resp.json();
  if (!result.success) {
    throw new Error(result.message || 'Unknown error fetching rider');
  }
  // If this is just a static fallback (profile only), treat as failure to fetch live data
  if (result.fallback) {
    throw new Error('Unable to fetch live rider data (static fallback only)');
  }
  const profile = result.profile || {};
  const files = result.files || result;
  const power = files.power || {};
  const eventsSummary = files.events_summary || {};
  const races = files.races || [];
  const groupRides = files.group_rides || [];
  const workouts = files.workouts || [];
  return {
    rider_id: riderId,
    ...profile,
    power,
    events: {
      races: { races, total_races: races.length, latest_race_date: eventsSummary.latest_race_date },
      group_rides: { group_rides: groupRides, total_group_rides: groupRides.length, latest_ride_date: eventsSummary.latest_ride_date },
      workouts: { workouts, total_workouts: workouts.length, latest_workout_date: eventsSummary.latest_workout_date },
      summary: eventsSummary || {}
    },
    intervals: power.intervals || [],
    ftp: power.ftp || profile.ftp || 0
  };
}
