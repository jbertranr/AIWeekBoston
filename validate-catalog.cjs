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

// Coordinates sanity (dins d'una bounding box àmplia de l'àrea metropolitana
// de Boston, MA — no un requisit estricte de festival, només un senyal
// d'error grosser com un signe canviat o un decimal mal col·locat).
for (const v of venues) {
  if (typeof v.lat === 'number' && typeof v.lng === 'number') {
    const { lat, lng } = v;
    if (lat < 42.0 || lat > 42.7 || lng < -71.5 || lng > -70.7) {
      errors.push(`${v.id}: coordinates look outside the Boston area (${lat}, ${lng})`);
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
