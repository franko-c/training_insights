// Simple live fetch for rider data via Netlify Functions proxy
export async function fetchRiderLive(riderId) {
  // Call Netlify Function endpoint
  const resp = await fetch('/api/fetch-rider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ riderId, force_refresh: false }),
  });
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
