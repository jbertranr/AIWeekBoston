---
tipus: aplicacio
ambits: []
ecosistemes: []
tecnologies:
  - html
  - css
  - javascript
  - leaflet
estat: pendent
ruta: "."
classificacio: "99"
---

# aiWeekBoston

Normativa: [[norm-web-vanilla]]

Codi: `apps/99_test/prj_ai_week_boston/aplicacions/aiWeekBoston/`

Guia de butxaca **independent** (no oficial) de tots els esdeveniments de la **Boston AI
Week 2026** (festival d'IA a Massachusetts, 16 de setembre – 28 d'octubre 2026, setmana
nucli 24 de setembre – 2 d'octubre, web oficial `aiweek.boston`, ~173+ esdeveniments
aprovats i creixent): catàleg d'esdeveniments, rellevància temporal en viu ("Ara"),
preferits/assistència i una ruta personal amb ordre suggerit per proximitat a peu.
**Anàloga directa de [[visaOffPerpinya]]**, mateix patró arquitectònic, adaptat del domini
"exposicions" (horari continu) al domini "esdeveniments" (hora puntual).

**La recerca de dades del catàleg encara no ha començat en aquesta fase** — vegeu
`INFORME_COBERTURA.md`: els fitxers `data/*.json` estan buits (`[]`), amb l'esquema fixat
i documentat més avall, a l'espera d'una tasca de recerca separada.

<!-- DESIGN-SYSTEM:START -->
Estil: els estils CSS d'aquesta aplicació són una còpia local del `design-system`
compartit (`apps/00_eines/0005_disseny/prj_design_system/aplicacions/design-system/`),
feta en crear el projecte a `assets/css/` — NO és un enllaç en viu. Consulta
`design-system/README.md` per veure l'origen i quins components hi ha disponibles; per
actualitzar la còpia local amb canvis posteriors del compartit, cal l'acció explícita
"Resincronitza design-system" des de l'admin del panell — no passa sol en desar/regenerar.
<!-- DESIGN-SYSTEM:END -->

## Decisions per defecte

- **Nom / `<title>`:** "Boston AI Week 2026". **Subtítol:** "Guia de butxaca de tots els
  esdeveniments".
- **Skin:** només `neutra` (sense selector de skin al topbar).
- **Sense backend, sense base de dades remota, sense autenticació.** Catàleg com a JSON
  estàtic versionat a `data/`; preferits/assistència/ruta a `localStorage` (sense compte
  d'usuari).
- **Una sola edició (2026)** — a diferència de `visaOffPerpinya`, no hi ha cap concepte
  `editions.json`/`editionId`: l'id d'un esdeveniment ja és únic per si sol.
- **Fus horari:** `America/New_York` (mai el del dispositiu de l'usuari) — tota la lògica
  temporal ("Ara", píndoles d'estat) hi treballa en "hora de paret".
- **Llindar de "comença aviat":** 45 minuts (`APP.startingSoonMinutes`), preferència
  d'interfície, no una dada del programa.
- **Data per defecte del selector "Planificar":** `2026-09-24` (`js/config.js` →
  `APP.defaultPlanDate`, inici de la setmana nucli del festival) — només el valor per
  defecte del selector; el mode "Ara" sempre fa servir l'hora real del dispositiu.
- **Punt de partida per defecte de "Ruta":** Seaport, Boston (`APP.bostonSeaportRef`,
  `{ lat: 42.3519, lng: -71.0455 }`) — només un punt de partida manual per defecte de la
  UI, no una dada de cap esdeveniment.
- **Ruta/planificació personal: només proximitat a peu** (com `visaOffPerpinya`) — **no**
  transport públic.
- **Node de classificació:** `99` sandbox; reclassificació manual posterior a decidir quan
  el catàleg estigui complet.
- **Motor de mapa:** Leaflet **1.9.3** vendoritzat (còpia literal de la de
  `visaOffPerpinya`, mateix origen: `leaflet.js`/`leaflet.css` "pelats" de `mapes-base`,
  sense el motor `MapJS` ni la configuració SIG de Mataró — vegeu «Desviació de
  normativa»).
- **Icona pròpia:** monograma neutre inventat (`assets/icons/icon.svg`, motiu abstracte de
  nodes/connexions que evoca una xarxa/IA, en els colors dels tokens de `skin-neutra`) —
  **no** cap logotip real de Boston AI Week ni de cap organitzador.

## Arquitectura

Multi-pàgina amb `router.js` del design-system (navegació sense recàrrega, `#main-content`
+ `<title>` es canvien dins d'un `startViewTransition`; el chrome —capçalera compacta i el
menú hamburguesa— no es toca mai):

```
index.html    → "Ara" (vista inicial): esdeveniments del dia, ordenats per rellevància temporal
explora.html  → "Explora": cerca + filtres (dia, format, barri, organitzador) sobre tot el catàleg
ruta.html     → "Ruta": selecció agrupada per seu, ordre suggerit, estimació editorial
mapa.html     → "Mapa" (secundària): un marcador per seu, Leaflet + OSM, color per format
fitxa.html    → Fitxa d'un esdeveniment (?id=…), accessible per URL directa
```

- **"Ara" (`index.html`/`js/ara.js`) és el canvi de concepte principal respecte a
  `visaOffPerpinya`.** Allà la pantalla inicial ("A prop") ordenava per proximitat
  espacial, perquè una exposició té horari continu (obert/tancat). Aquí els esdeveniments
  són puntuals (hora d'inici i, sovint, de fi fixes), així que "Ara" **no agrupa per seu ni
  fa servir geolocalització**: mostra només els esdeveniments del dia que s'està mirant
  (avui en mode "Ara", el dia triat en mode "Planificar"), en una llista plana ordenada per
  rellevància temporal — en curs primer, després els que comencen aviat, després la resta
  del dia. La informació més rellevant queda visible sense scroll ni obrir cap menú.
- **`js/config.js`** → `window.APP` (títol, subtítol, fus horari, llindars, punt de
  referència de Seaport, claus de `localStorage`).
- **`js/modules/`** (ES modules reals, `export`/`import`): `storage.js` (embolcall
  try/catch de `localStorage`), `data.js` (`fetch` del catàleg + índexs, amb còpia a
  `localStorage` per a ús sense connexió), `status.js` (equivalent d'`opening.js` a
  `visaOffPerpinya`, però amb semàntica d'esdeveniment puntual: en-curs / comença-aviat /
  proper / acabat / desconegut, sempre en «hora de paret» de `America/New_York`), `geo.js`
  (geolocalització sota demanda, distància en línia recta, enllaç «Com arribar» a Google
  Maps mode a peu), `state.js` (preferits/assistència/ruta/punt de partida/mode
  Ara-Planificar, tot a `localStorage`), `ui.js` (targeta d'esdeveniment, grup per seu,
  distintiu de format, píndola d'estat, fitxa completa — sense `innerHTML` amb dades del
  catàleg).
- **`js/ara.js` / `explora.js` / `ruta.js` / `mapa.js` / `fitxa.js`** — un script
  **clàssic** (no `type="module"`) per pantalla, que carrega els mòduls anteriors amb
  `import()` **dinàmic** dins d'una IIFE. Vegeu «Desviació de normativa» — és necessari
  perquè `router.js` funcioni bé amb navegació sense recàrrega.
- Convenció de noms: als scripts de pàgina i a `ui.js`, l'objecte de domini
  "esdeveniment" es diu sempre `item` als paràmetres — mai `event`, per no confondre'l amb
  un DOM Event.

## Model de dades (`data/*.json`)

Una sola edició: `organizers.json` / `venues.json` / `events.json` + `coverage.json`
(comptadors d'importació/verificació, separats del catàleg mateix). Identificadors
estables (kebab-slug), mai la posició en un array. Esquema fixat (any 2026-09-13, abans de
començar la recerca de dades):

```jsonc
// data/organizers.json → { "organizers": [ {...} ] }
{
  "id": "kebab-slug",
  "name": "string",
  "type": "startup|university|enterprise|vc|coworking|community|public|media|other",
  "url": "string|null",
  "notesCa": "string"
}

// data/venues.json → { "venues": [ {...} ] }
{
  "id": "kebab-slug",
  "name": "string",
  "address": "string|null",
  "neighborhood": "string|null",
  "lat": 0.0,
  "lng": 0.0,
  "coordinateStatus": "verified|approximate|pending",
  "retrievalMethod": "nominatim|manual-cross-check|pending",
  "sourceUrl": "string|null",
  "notesCa": "string"
}

// data/events.json → { "events": [ {...} ] }
{
  "id": "kebab-slug-unic",
  "title": "string",
  "organizerId": "string|null",
  "organizerNameRaw": "string|null",
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm|null",
  "endTime": "HH:mm|null",
  "venueId": "string|null",
  "venueCandidates": ["string"],
  "format": "Summit|Panel|Workshop|Talk|Meetup|Conference|Hackathon|DemoNight|Other",
  "topic": "string|null",
  "audience": "string|null",
  "cost": "free|paid|invite-only|unknown",
  "registrationRequired": true,
  "registrationUrl": "string|null",
  "sourceUrl": "string",
  "venueStatus": "confirmed|tentative|pending",
  "recordStatus": "confirmed|tentative|pending",
  "retrievalMethod": "official-site|luma|eventbrite|meetup|partiful|press|social-media|pending",
  "notesCa": "string"
}

// data/coverage.json → objecte (no array)
{
  "lastUpdated": "YYYY-MM-DD",
  "officialSiteTotalApproved": 173,
  "imported": 0,
  "byRecordStatus": { "confirmed": 0, "tentative": 0, "pending": 0 },
  "sourcesChecked": [],
  "knownGaps": [],
  "conflicts": []
}
```

`venues.json` porta `lat`/`lng` com a camps plans (no un objecte `coordinates` niat) —
`js/modules/data.js` deriva un `venue.coordinates` intern en carregar el catàleg perquè la
resta de mòduls (`geo.js`, `ui.js`, `mapa.js`, `ruta.js`) tinguin una única forma d'accedir-
hi. No hi ha camp `image` a `events.json` (a diferència de `visaOffPerpinya`): cap
targeta/fitxa mostra fotografia — no hi ha encara cap font de la qual n'hi hagi.

**Actualitzar el catàleg:** edita els `data/*.json` (o substitueix-los sencers) mantenint
el mateix esquema, i executa `node validate-catalog.cjs` (arrel del projecte) — comprova
referències trencades, ids duplicats i coordenades fora de l'àrea de Boston abans de
publicar. No cal tocar cap fitxer HTML/JS.

## Desviació de normativa

- **Càrrega de mòduls ES amb `import()` dinàmic des d'scripts clàssics** (`js/ara.js` i
  companyia), en lloc de `<script type="module" src="…">` directe: `router.js` del
  design-system compartit recrea els `<script src>` en navegar sense recàrrega però **no
  conserva `type="module"`** — un script de pàgina carregat així trencaria en la primera
  navegació. `import()` dinàmic funciona igual des d'un script clàssic i és compatible amb
  el contracte real de `router.js`. Els mòduls compartits (`js/modules/*.js`) sí són ES
  modules «normals» (`export`/`import`), ja que mai es referencien directament amb
  `<script src>` — només amb `import()`. **No s'ha tocat `router.js` compartit.**
- **Motor de mapa:** Leaflet «pla» (còpia literal de la de `visaOffPerpinya`, que al seu
  torn ve del `leaflet.js`/`leaflet.css` de `mapes-base`, sense el motor `MapJS` ni la
  configuració SIG de Mataró — les capes WMS de `mapes-base` són específiques del
  territori de Mataró, no de Boston) + tessel·les públiques d'OpenStreetMap. **No es fa
  servir `components/map.css` (`.ds-map*`)**: la pantalla «Mapa» és a pantalla completa
  sota el chrome mòbil, no el shell de 3 zones (cerca + mapa + llista) pensat per a
  escriptori que `map.css` dona per fet. Mateix tipus de desviació que
  [[visaOffPerpinya]], [[seguimentTerritori]] i `visorMapes`.
- **Paleta de colors local per format d'esdeveniment** (`aiwb-badge--<format>` /
  `aiwb-map-marker--<format>` a `app.css`): 9 formats necessiten més varietat de color que
  els 2 tokens `--ds-color-primary`/`--ds-color-accent` que ja hi ha — s'ha afegit una
  petita paleta pròpia (`--aiwb-color-talk`, `--aiwb-color-meetup`,
  `--aiwb-color-conference`, `--aiwb-color-hackathon`, `--aiwb-color-demonight`) **local a
  aquesta app**, no un canvi del design-system compartit (mateix patró que `.voff-badge--off`
  a `visaOffPerpinya`).

## Normes del projecte

- Aplicació personal, sense multiusuari ni backend (norma web-vanilla). Cap credencial ni
  servei de pagament.
- Tots els textos visibles, en català; noms d'esdeveniments/organitzadors, sense traduir.
- Les dades de negoci van als JSON (`data/`), mai al codi JavaScript. Cap resum ni
  descripció generats a partir només del títol — el camp `topic`/`notesCa` només s'omple
  quan hi ha una font verificada.
- Res d'`innerHTML` amb dades del catàleg — DOM via `createElement`/`textContent`
  (`js/modules/ui.js`).
- No s'ha afegit cap framework (React, jQuery…) ni servei de tercers de pagament.
- **PWA (millora progressiva):** `manifest.json` + `sw.js` — cache-first per al shell,
  network-first amb reserva per als JSON del catàleg. **No es cachegen tessel·les de mapa**
  (política dels servidors públics d'OSM).

## Comandes de verificació

- `node --check js/*.js js/modules/*.js sw.js` — ha de sortir net.
- `node validate-catalog.cjs` — integritat referencial del catàleg (ids duplicats,
  referències trencades, coordenades fora de l'àrea de Boston). Amb el catàleg buit actual:
  0 esdeveniments / 0 seus / 0 organitzadors, 0 errors.
- Servir amb qualsevol servidor HTTP simple (`python -m http.server`, o `panell` via
  `/files/`) i comprovar les 5 pantalles + la fitxa amb `?id=…` directe.
- `claude-inspector`:
  `node cli.js --project=C:/Users/jbertran/apps/99_test/prj_ai_week_boston/aplicacions/aiWeekBoston`

## Cobertura de dades i limitacions conegudes

Vegeu `INFORME_COBERTURA.md` per al detall. **Resum: la recerca de dades del catàleg
(esdeveniments, seus, organitzadors reals de Boston AI Week 2026) és una tasca separada,
encara no iniciada en aquesta fase** — aquest projecte és només l'esquelet de
l'aplicació, amb `data/*.json` buits (`[]`) seguint l'esquema documentat més amunt.
