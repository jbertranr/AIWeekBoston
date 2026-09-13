/* ============================================================
   modules/data.js
   Càrrega del catàleg (JSON estàtics versionats) + índexs en
   memòria. El JSON és sempre la font — no hi ha scraping des del
   navegador. Es guarda una còpia a localStorage perquè les fitxes
   desades funcionin sense connexió i per poder mostrar "s'està
   utilitzant una còpia desada" si el fetch falla.

   Una sola edició (2026): a diferència de visaOffPerpinya, aquí no
   hi ha `editionId` — l'id d'un esdeveniment ja és únic per si sol.
   ============================================================ */

import { readJSON, writeJSON } from "./storage.js";

let cachedCatalog = null;

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} a ${url}`);
  return res.json();
}

function buildIndex(list, key = "id") {
  const map = new Map();
  for (const item of list) map.set(item[key], item);
  return map;
}

// El JSON de venues porta lat/lng com a camps propis (esquema fixat a
// index.md) — es deriva un objecte `coordinates` intern perquè la resta
// de mòduls (geo.js, ui.js, mapa.js, ruta.js) tinguin una única forma
// d'accedir-hi, independentment de si l'origen és lat/lng plans.
function enrichVenue(venue) {
  const hasCoords = typeof venue.lat === "number" && typeof venue.lng === "number";
  return {
    ...venue,
    coordinates: hasCoords ? { lat: venue.lat, lng: venue.lng } : null
  };
}

function buildCatalog({ organizers, venues, events, coverage }) {
  const organizersById = buildIndex(organizers.organizers);
  const enrichedVenues = venues.venues.map(enrichVenue);
  const venuesById = buildIndex(enrichedVenues);

  // Esdeveniments enriquits amb les seves referències resoltes, per no
  // repetir la mateixa cerca a cada pantalla.
  const enrichedEvents = events.events.map((ev) => ({
    ...ev,
    organizer: ev.organizerId ? organizersById.get(ev.organizerId) || null : null,
    venue: ev.venueId ? venuesById.get(ev.venueId) || null : null,
    venueCandidatesResolved: (ev.venueCandidates || []).map((id) => venuesById.get(id)).filter(Boolean)
  }));

  return {
    organizers: organizers.organizers,
    venues: enrichedVenues,
    events: enrichedEvents,
    coverage: coverage || null,
    organizersById,
    venuesById,
    eventsById: buildIndex(enrichedEvents)
  };
}

/**
 * Carrega el catàleg complet. Retorna { catalog, fromCache, fetchedAt }.
 * Si el fetch falla (sense connexió), recupera la còpia de localStorage
 * si n'hi ha — l'aplicació ha de continuar sent utilitzable.
 */
export async function loadCatalog() {
  if (cachedCatalog) return { catalog: cachedCatalog, fromCache: false, fetchedAt: null };

  const files = window.APP.dataFiles;
  try {
    const [organizers, venues, events, coverage] = await Promise.all([
      fetchJSON(files.organizers),
      fetchJSON(files.venues),
      fetchJSON(files.events),
      fetchJSON(files.coverage)
    ]);
    const raw = { organizers, venues, events, coverage };
    cachedCatalog = buildCatalog(raw);
    const fetchedAt = new Date().toISOString();
    writeJSON(window.APP.storageKeys.catalogCache, { raw, fetchedAt });
    return { catalog: cachedCatalog, fromCache: false, fetchedAt };
  } catch (err) {
    console.warn("[data] fetch del catàleg fallit, provant còpia local", err);
    const saved = readJSON(window.APP.storageKeys.catalogCache, null);
    if (saved && saved.raw) {
      cachedCatalog = buildCatalog(saved.raw);
      return { catalog: cachedCatalog, fromCache: true, fetchedAt: saved.fetchedAt };
    }
    throw err;
  }
}

export function groupByVenue(events) {
  const groups = new Map();
  for (const ev of events) {
    const key = ev.venueId || "__pendent__";
    if (!groups.has(key)) {
      groups.set(key, {
        venue: ev.venue,
        venueId: ev.venueId,
        pending: !ev.venueId,
        events: []
      });
    }
    groups.get(key).events.push(ev);
  }
  return Array.from(groups.values());
}
