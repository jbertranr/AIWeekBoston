/* ============================================================
   modules/state.js
   Preferits, assistència ("hi vaig"/"ja hi he anat"), ruta, punt de
   partida i mode Ara/Planificar — tot local (localStorage), vinculat
   a l'id de l'esdeveniment (una sola edició: no cal cap prefix
   d'edició, a diferència de visaOffPerpinya). Sense compte d'usuari.
   ============================================================ */

import { readJSON, writeJSON } from "./storage.js";

const K = () => window.APP.storageKeys;

// ── Preferits / assistència (conjunts d'ids d'esdeveniment) ──
function fullId(ev) {
  return ev.id;
}

function readSet(key) {
  return new Set(readJSON(key, []));
}
function writeSet(key, set) {
  writeJSON(key, Array.from(set));
}

export function isFavorite(ev) {
  return readSet(K().favorites).has(fullId(ev));
}
export function toggleFavorite(ev) {
  const s = readSet(K().favorites);
  const id = fullId(ev);
  s.has(id) ? s.delete(id) : s.add(id);
  writeSet(K().favorites, s);
  return s.has(id);
}
export function favoriteIds() {
  return readSet(K().favorites);
}

// "Assistència": marca "hi vaig" / "ja hi he anat" — equivalent a
// "visitades" a visaOffPerpinya, amb el nom adaptat al domini.
export function isAttending(ev) {
  return readSet(K().attendance).has(fullId(ev));
}
export function toggleAttending(ev) {
  const s = readSet(K().attendance);
  const id = fullId(ev);
  s.has(id) ? s.delete(id) : s.add(id);
  writeSet(K().attendance, s);
  return s.has(id);
}
export function attendingIds() {
  return readSet(K().attendance);
}

// ── Ruta (llista ordenada d'ids, no de posicions) ──
export function getRoute() {
  return readJSON(K().route, []);
}
export function setRoute(idsArray) {
  writeJSON(K().route, idsArray);
}
export function isInRoute(ev) {
  return getRoute().includes(fullId(ev));
}
export function addToRoute(ev) {
  const r = getRoute();
  const id = fullId(ev);
  if (!r.includes(id)) r.push(id);
  setRoute(r);
}
export function removeFromRoute(ev) {
  setRoute(getRoute().filter((id) => id !== fullId(ev)));
}
export function reorderRoute(fromIndex, toIndex) {
  const r = getRoute();
  const [moved] = r.splice(fromIndex, 1);
  r.splice(toIndex, 0, moved);
  setRoute(r);
}
export { fullId };

// ── Punt de partida manual / GPS / referència de Seaport ──
export function getStartPoint() {
  return readJSON(K().startPoint, { kind: "manual-seaport" });
}
export function setStartPoint(point) {
  writeJSON(K().startPoint, point);
}

// ── Mode Ara / Planificar ──
export function getPlanMode() {
  return readJSON(K().planMode, "ara");
}
export function setPlanMode(mode) {
  writeJSON(K().planMode, mode);
}
export function getPlanDateTime() {
  return readJSON(K().planDateTime, { date: window.APP.defaultPlanDate, time: "10:00" });
}
export function setPlanDateTime(dt) {
  writeJSON(K().planDateTime, dt);
}

// ── Preferències (llindar de "comença aviat"…) ──
export function getPrefs() {
  return readJSON(K().prefs, { startingSoonMinutes: window.APP.startingSoonMinutes });
}
export function setPrefs(patch) {
  writeJSON(K().prefs, { ...getPrefs(), ...patch });
}
