// Simple live fetch for rider data via Netlify Functions proxy
export async function fetchRiderLive(riderId) {
  // Use Netlify Functions proxy for both development and production
  const url = `/api/fetch-rider`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ riderId, force_refresh: false })
  });
  if (!resp.ok) {
    throw new Error(`Fetch live rider data failed: HTTP ${resp.status}`);
  }
  const result = await resp.json();
  // Handle both wrapped and direct API responses
  // Extract profile and data root
  const profile = result.profile || result;
  const dataRoot = result.files || result;
  // Power data
  const power = dataRoot.power || {};
  // Event data (structured under events or flat files)
  const eventsData = dataRoot.events || {};
  const races = eventsData.races?.events || dataRoot.races || [];
  const groupRides = eventsData.group_rides?.events || dataRoot.group_rides || [];
  const workouts = eventsData.workouts?.events || dataRoot.workouts || [];
  // Summary metadata
  const eventsSummary = eventsData.summary || dataRoot.events_summary || {};
  return {
    rider_id: riderId,
    ...profile,
    power,
    events: {
      races: { races, total_races: races.length, latest_race_date: eventsData.races?.latest_date },
      group_rides: { group_rides: groupRides, total_group_rides: groupRides.length, latest_ride_date: eventsData.group_rides?.latest_date },
      workouts: { workouts, total_workouts: workouts.length, latest_workout_date: eventsData.workouts?.latest_date },
      summary: eventsSummary || {}
    },
    intervals: power.intervals || [],
    ftp: power.ftp || profile.ftp || 0
  };
}
