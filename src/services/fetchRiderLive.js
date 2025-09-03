// Simple live fetch for rider data via Netlify Functions proxy
export async function fetchRiderLive(riderId) {
  // Determine API endpoint: use Vite proxy in DEV, direct backend in production
  const url = import.meta.env.DEV
    ? `/api/fetch-rider/${encodeURIComponent(riderId)}?force_refresh=false`
    : `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/,'')}/fetch-rider/${encodeURIComponent(riderId)}?force_refresh=false`;

   const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
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
