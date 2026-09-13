# Informe de cobertura — Boston AI Week 2026

Preparat: 2026-09-13. **Recerca de dades encara no iniciada en aquesta fase** — aquesta
tasca s'ha limitat a crear l'esquelet de l'aplicació (estructura, pàgines, lògica,
design-system). No s'ha consultat cap font real (`aiweek.boston` ni cap altra) i no s'ha
importat cap esdeveniment, seu ni organitzador. Aquest informe reprodueix l'estructura de
l'informe equivalent de [[visaOffPerpinya]] perquè quedi fixat el format que caldrà omplir
quan comenci la recerca real.

## Resum

| | Anunciats (web oficial) | Importats | Seu assignada | Coordenades | Format assignat |
|---|---|---|---|---|---|
| **Esdeveniments** | ~173+ (creixent) | **0** | 0/0 | 0/0 | 0/0 |

**Emplaçaments:** 0 geocodificats. **Organitzadors:** 0 identificats.

## Boston AI Week 2026 — 0/~173+ importats (pendent)

Res importat encara. Quan comenci la recerca, aquesta secció ha de documentar, com a
mínim:

- Font(s) consultada(es) per a cada esdeveniment (web oficial `aiweek.boston`, Luma,
  Eventbrite, Meetup, Partiful, premsa, xarxes socials…) — camp `retrievalMethod` de
  `data/events.json`.
- Quins esdeveniments tenen seu confirmada (`venueStatus: "confirmed"`) davant dels que
  encara són provisionals (`"tentative"`) o pendents (`"pending"`).
- Qualsevol conflicte de font (mateix esdeveniment amb dades contradictòries entre dues
  fonts) — anàleg al cas de David Guttenfelder a `visaOffPerpinya`.
- Bloquejos o limitacions d'accés trobades (paginació, JavaScript no renderitzat sense
  navegador real, límits de freqüència, autenticació requerida…).

## Geocodificació de seus (pendent)

Encara no s'ha geocodificat cap seu. Quan es faci (previsiblement amb Nominatim,
`nominatim.openstreetmap.org`, respectant el límit d'una petició per segon i identificant
l'aplicació al `User-Agent`, seguint el mateix procediment que `visaOffPerpinya`), cal
documentar aquí:

- Nombre de seus geocodificades amb èxit / amb portal exacte / només a nivell de
  carrer-illa (`coordinateStatus: "verified"` vs. `"approximate"`).
- Seus sense resoldre (`"pending"`) i els intents fets.

## Organitzadors (pendent)

Encara no s'ha identificat cap organitzador (`data/organizers.json` buit). Quan es
completi, documentar quants organitzadors tenen web verificada (`url`) i de quin tipus són
(`startup`/`university`/`enterprise`/`vc`/`coworking`/`community`/`public`/`media`/`other`).

## Limitacions explícites (a mantenir quan comenci la recerca real)

- Cap dada inventada — un camp sense font verificada es queda `null`/`"pending"`, mai
  s'omple amb un valor plausible.
- Cap recompte "arrodonit" — el nombre d'esdeveniments importats reflecteix exactament el
  que hi ha a `data/events.json`, mai una xifra anunciada sense verificar-la.
- Aquest fitxer s'ha d'actualitzar en cada lot d'importació real, junt amb
  `data/coverage.json` (comptadors) — mai deixar-los desincronitzats.
