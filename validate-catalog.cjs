const fs = require('fs');
const d = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const organizers = d('data/organizers.json').organizers;
const venues = d('data/venues.json').venues;
const events = d('data/events.json').events;

const organizerIds = new Set(organizers.map(o => o.id));
const venueIds = new Set(venues.map(v => v.id));
const eventIds = new Set();

let errors = [];

for (const ev of events) {
  if (eventIds.has(ev.id)) errors.push(`Duplicate event id: ${ev.id}`);
  eventIds.add(ev.id);
  if (ev.organizerId && !organizerIds.has(ev.organizerId)) errors.push(`${ev.id}: unknown organizerId ${ev.organizerId}`);
  if (ev.venueId && !venueIds.has(ev.venueId)) errors.push(`${ev.id}: unknown venueId ${ev.venueId}`);
  for (const vid of ev.venueCandidates || []) {
    if (!venueIds.has(vid)) errors.push(`${ev.id}: unknown venueCandidate ${vid}`);
  }
  // Coherència d'horari (mateix dia, esdeveniment puntual).
  if (ev.startTime && ev.endTime && ev.startTime > ev.endTime) {
    errors.push(`${ev.id}: startTime > endTime`);
  }
  if (!ev.date) errors.push(`${ev.id}: falta date`);
}

// Duplicate ids elsewhere
const dupCheck = (list, label) => {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.id)) errors.push(`Duplicate ${label} id: ${item.id}`);
    seen.add(item.id);
  }
};
dupCheck(organizers, 'organizer');
dupCheck(venues, 'venue');

// Coordinates sanity: distància en línia recta al centre de referència de
// Boston (City Hall), no una capsa rectangular rígida — Boston AI Week té
// seus legítimes fins a ~65 km (p. ex. Devens) que una bounding box estreta
// descartaria com a error. Mateix llindar (70 km) que la geocodificació.
const BOSTON_CITY_HALL = { lat: 42.3601, lng: -71.0589 };
const MAX_KM = 70;
function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
for (const v of venues) {
  if (typeof v.lat === 'number' && typeof v.lng === 'number') {
    const distKm = haversineKm(BOSTON_CITY_HALL, { lat: v.lat, lng: v.lng });
    if (distKm > MAX_KM) {
      errors.push(`${v.id}: coordinates ${distKm.toFixed(0)} km from Boston center, above the ${MAX_KM} km sanity threshold (${v.lat}, ${v.lng})`);
    }
  }
}

console.log(`Events: ${events.length}`);
console.log(`Venues: ${venues.length}, Organizers: ${organizers.length}`);

if (errors.length) {
  console.log(`\n${errors.length} ERRORS:`);
  errors.forEach(e => console.log(' - ' + e));
  process.exit(1);
} else {
  console.log('\nOK: cap error d\'integritat referencial.');
}
