/* ============================================================
   Boston AI Week 2026 — configuració
   Script clàssic (no mòdul) perquè estigui disponible com a global
   window.APP abans que s'executin els mòduls de cada pantalla.
   ============================================================ */
window.APP = {
  title: "Boston AI Week 2026",
  subtitle: "Guia de butxaca de tots els esdeveniments",
  timeZone: "America/New_York",

  // Data per defecte del selector "Planificar" — l'inici de la setmana
  // nucli del festival (24/09–2/10/2026). Només és el valor per defecte
  // del selector; el mode "Ara" sempre fa servir l'hora real del
  // dispositiu, convertida a America/New_York.
  defaultPlanDate: "2026-09-24",

  // Llindar de "comença aviat": preferència de la interfície, no una
  // dada del programa oficial.
  startingSoonMinutes: 45,

  // Referència explícita d'un punt de partida per defecte (Seaport,
  // Boston) — NO és una ubicació real de l'usuari, només un punt de
  // partida manual per defecte per a la pantalla "Ruta".
  bostonSeaportRef: { lat: 42.3519, lng: -71.0455, label: "Seaport, Boston (referència)" },

  storageKeys: {
    favorites: "aiWeekBoston:favorits",
    attendance: "aiWeekBoston:assistencia",
    route: "aiWeekBoston:ruta",
    startPoint: "aiWeekBoston:puntPartida",
    planMode: "aiWeekBoston:mode",
    planDateTime: "aiWeekBoston:dataHoraPlanificada",
    prefs: "aiWeekBoston:preferencies",
    catalogCache: "aiWeekBoston:catalogCache"
  },

  dataFiles: {
    organizers: "data/organizers.json",
    venues: "data/venues.json",
    events: "data/events.json",
    coverage: "data/coverage.json"
  }
};
