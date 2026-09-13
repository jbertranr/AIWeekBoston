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

**Primera càrrega real feta (13/09/2026): 173/173 esdeveniments** importats des
d'`aiweek.boston/schedule` (coincideix amb el total oficial), 128 organitzadors i 116 seus
úniques. **40/103 seus amb nom real ja geocodificades** (Nominatim, `coordinateStatus:
"approximate"`); 63 encara pendents (no consten a OpenStreetMap amb aquest nom) i 12 amb
seu no revelada per l'organitzador. Cap altra font agregadora (Luma/Eventbrite/Meetup/
Partiful) contrastada encara. Detall complet, mètode i limitacions: `INFORME_COBERTURA.md`
i `data/coverage.json`.

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
- **Eixos d'interès per a la puntuació de rellevància personal** (13/09/2026, triats
  explícitament per l'usuari via `AskUserQuestion`, no assumits): (1) governança i IA
  responsable al sector públic, (2) IA aplicada / eines i productes, (3) enginyeria i
  infraestructura tècnica. **Explícitament exclòs:** startups/inversió/ecosistema/networking.
  Si es torna a calcular la puntuació (nou esdeveniment, revisió), fer-ho servir aquests
  mateixos 3 eixos sense repreguntar — vegeu «Puntuació de rellevància personal» més avall.

## Arquitectura

Multi-pàgina amb `router.js` del design-system (navegació sense recàrrega, `#main-content`
+ `<title>` es canvien dins d'un `startViewTransition`; el chrome —capçalera compacta i el
menú hamburguesa— no es toca mai):

```
index.html    → "Explora" (vista inicial): cerca + filtres (dia, format, barri, organitzador)
ara.html      → "Ara": esdeveniments del dia, ordenats per rellevància temporal
ruta.html     → "Ruta": selecció agrupada per seu, ordre suggerit, estimació editorial
mapa.html     → "Mapa" (secundària): un marcador per seu, Leaflet + OSM, color per format
fitxa.html    → Fitxa d'un esdeveniment (?id=…), accessible per URL directa
```

- **Pàgina d'entrada: "Explora" (`index.html`), no "Ara".** Fins al 13/09/2026 la vista
  inicial era "Ara" a `index.html`; l'usuari va demanar explícitament que "Explora" fos el
  primer que es veiés en entrar — sobretot perquè "Ara" queda buida cada dia que no hi ha
  cap esdeveniment en curs (com passa fins que comença la setmana nucli el 24/09). S'han
  intercanviat els continguts dels fitxers (`index.html` ara serveix "Explora"/`js/
  explora.js`, i l'antic `index.html` viu a `ara.html`/`js/ara.js`), i s'ha actualitzat la
  navegació (tabbar + menú hamburguesa) de totes les pantalles en conseqüència — `data-tab`/
  `data-nav-page` de "Explora" és ara `"index"` i el d'"Ara" és `"ara"`.
- **"Ara" (`ara.html`/`js/ara.js`) és el canvi de concepte principal respecte a
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
  "coordinateStatus": "verified|approximate|pending|not-applicable",
  "retrievalMethod": "nominatim|manual-cross-check|pending",
  "sourceUrl": "string|null",
  "notesCa": "string"
}
// "not-applicable" (afegit en la primera càrrega real): esdeveniment virtual,
// sense seu física — mai coordenades ni com si fossin "pending".

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
  "format": "Summit|Panel|Workshop|Talk|Meetup|Conference|Hackathon|DemoNight|Community|Other",
  "topic": "string|null",
  "description": "string|null", // afegit 13/09/2026: text de la secció "About" de la
  // fitxa individual de l'esdeveniment (no de la pàgina llistat, que no el dona) —
  // vegeu INFORME_COBERTURA.md § Actualització 13/09/2026. Preferit a `topic` a la UI.
  "audience": "string|null",
  "cost": "free|paid|invite-only|unknown",
  "registrationRequired": true,
  "registrationUrl": "string|null",
  "sourceUrl": "string",
  "venueStatus": "confirmed|tentative|pending",
  "recordStatus": "confirmed|tentative|pending",
  "retrievalMethod": "official-site|luma|eventbrite|meetup|partiful|press|social-media|pending",
  "notesCa": "string",
  "relevanceScore": 0, // afegit 13/09/2026: 1-10, judici EDITORIAL fet a mà (no una
  // mètrica objectiva) sobre els 3 eixos d'interès de «Decisions per defecte» — vegeu
  // § «Puntuació de rellevància personal» més avall.
  "relevanceReasons": ["string", "string", "string"] // exactament 3, sempre
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

**`data/park-and-ride.json`** (afegit 13/09/2026): NO forma part del catàleg
d'esdeveniments — és una llista fixa i editorial de grans aparcaments Park + Ride de metro
(`{ "id", "name", "line", "address", "lat", "lng", "spaces", "coordinateStatus",
"retrievalMethod", "sourceUrl", "notesCa" }` + un bloc `meta` amb els criteris de selecció).
Es carrega només des de `js/mapa.js` (`renderParkAndRide()`), no des de
`modules/data.js`/`loadCatalog()`. `spaces` és `null` quan no s'ha trobat cap font pública
que confirmi la capacitat — mai un valor inventat.

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
  `--aiwb-color-conference`, `--aiwb-color-hackathon`, `--aiwb-color-demonight`,
  `--aiwb-color-community`) **local a aquesta app**, no un canvi del design-system compartit
  (mateix patró que `.voff-badge--off` a `visaOffPerpinya`).
- **Leaflet.markercluster 1.5.3 vendoritzat** (`assets/vendor/leaflet.markercluster-1.5.3/`,
  descarregat d'unpkg): bug real (13/09/2026) — amb els ~40 marcadors de seu del catàleg
  real, 37/40 queden a <24px els uns dels altres en la vista inicial (`fitBounds` sobre tota
  l'àrea del festival), i el marcador de sobre intercepta el clic dels de sota (confirmat
  amb Playwright: `locator.click()` fallava dient que un marcador veí "intercepts pointer
  events"). `js/mapa.js` ara afegeix els marcadors a un `L.markerClusterGroup()` en lloc de
  directament al mapa — a zoom baix es veu un clúster amb comptador, que en clicar-lo apropa
  el zoom (i acaba fent "spiderfy" si cal) fins que els marcadors queden prou separats per
  ser clicables individualment.
- **Marcadors fixos de Park + Ride** (`data/park-and-ride.json`, 6 estacions de metro amb
  aparcament gran: Alewife, Quincy Adams, Braintree, Wonderland, Oak Grove, Riverside —
  seleccionats per ser els grans P+R de final de línia documentats públicament, no els ~100
  aparcaments que gestiona l'MBTA en total). Capa a part, sempre visible, **no** agrupada
  amb el `markerClusterGroup` dels esdeveniments (és una capa de referència fixa, no un
  resultat de cerca ni depèn del filtre de format).
- **Seguiment de ubicació en viu** (`geo.js` → `watchLocation()`/`stopWatchingLocation()`,
  basat en `navigator.geolocation.watchPosition`, no `getCurrentPosition` d'un sol tret): el
  botó de localitzar és ara un interruptor — un clic l'activa (el punt blau es va actualitzant
  sol, amb un pols animat) i un altre clic l'atura. **Bug real trobat i corregit en aquesta
  mateixa sessió**: el primer intent aturava tot el seguiment davant de QUALSEVOL error de
  `watchPosition`, inclosos els transitoris (GPS momentàniament sense senyal) — es va
  detectar simulant un canvi d'ubicació amb Playwright, que provoca un error `unavailable`
  intermedi abans d'entregar la posició nova. Ara només un error **permanent** (permís
  denegat) atura el seguiment; els transitoris només mostren un avís i el
  `watchPosition` natiu segueix actiu sol. **"Sota demanda, mai en segon pla" es manté**: el
  seguiment s'atura explícitament en sortir de la pantalla "Mapa" (a `init()`, quan
  `#aiwb-map` ja no existeix al DOM perquè `router.js` ha canviat de pàgina) — un
  `watchPosition` actiu no sobreviu mai a la navegació.
- **Con d'orientació (com el de Google Maps)** (`geo.js` → `watchHeading()`, basat en
  `deviceorientationabsolute`/`deviceorientation`): mentre el seguiment en viu està actiu, un
  con blau gira al voltant del punt "la teva ubicació" indicant cap on apunta el mòbil.
  **Només es mostra si el navegador dona una orientació REALMENT absoluta** (`event.absolute
  === true`, o `webkitCompassHeading` a iOS) — mai una fletxa basada en una orientació
  relativa a com tenia el mòbil en carregar la pàgina, que seria enganyosa. Alguns
  navegadors (Safari iOS ≥13, i s'ha detectat que també Chromium recent) exposen
  `DeviceOrientationEvent.requestPermission()`: cal cridar-lo dins del mateix gest de l'usuari
  que activa el seguiment (el clic al botó), i si no es concedeix el con simplement no es
  mostra — la ubicació en viu continua funcionant igual. El marcador "la teva ubicació" ara
  es crea un sol cop i després només es mou (`setLatLng`) en lloc de refer-se a cada posició,
  perquè el con pugui rotar moltes vegades per segon sense parpellejar.
  **Dos bugs reals trobats provant-ho en un dispositiu real (13/09/2026), corregits el
  mateix dia:** (1) el rumb sortia girat 180° — `(360 - alpha)` calcula el sentit de gir
  correcte però amb la referència capgirada; corregit a `(360 - alpha + 180) % 360`. (2) el
  con quedava desplaçat 42px (exactament mig con) cap avall-dreta del punt — `rotateHeading()`
  feia `style.transform = "rotate(Xdeg)"`, que substitueix TOT el `transform` inline i esborra
  el `translate(-50%, -50%)` de `app.css` que el centra; corregit repetint el `translate` a
  cada actualització. Verificat amb `getBoundingClientRect()` via Playwright que els centres
  del punt i del con coincideixen exactament (dx=dy=0px).
- **Rotació del mapa amb dos dits: provada i retirada (13/09/2026).** Es va integrar
  `leaflet-rotate` (plugin de Raruto, GPL-3.0 — única excepció de llicència que hi ha hagut
  al projecte, la resta és BSD/MIT) i funcionava correctament (verificat amb Playwright: con
  d'orientació compensant la rotació del mapa, clústers i clics sobrevivint al gir), però
  l'usuari va demanar treure-la del tot — no només la icona de brúixola, la funcionalitat
  sencera. El mapa torna a estar sempre orientat al nord, sense girar. La llibreria
  s'ha desvendoritzat completament (ja no hi ha cap dependència GPL al projecte).
  **Bug real trobat mentre hi era** (no relacionat amb la rotació en si, i que es manté
  corregit): la caixa de 84×84 del marcador "la teva ubicació" —majoritàriament
  transparent— bloquejava els clics dels marcadors que hi havia a sota seu; corregit amb
  `interactive: false` (el punt no necessita ser clicable).

- Aplicació personal, sense multiusuari ni backend (norma web-vanilla). Cap credencial ni
  servei de pagament.
- Tots els textos visibles, en català; noms d'esdeveniments/organitzadors, sense traduir.
- Les dades de negoci van als JSON (`data/`), mai al codi JavaScript. Cap resum ni
  descripció generats a partir només del títol — el camp `topic`/`notesCa` només s'omple
  quan hi ha una font verificada.
- Res d'`innerHTML` amb dades del catàleg — DOM via `createElement`/`textContent`
  (`js/modules/ui.js`).
- No s'ha afegit cap framework (React, jQuery…) ni servei de tercers de pagament.
- **Llicències de tercers:** totes les llibreries vendoritzades són BSD/MIT (Leaflet,
  Leaflet.markercluster, Font Awesome Pro comprada) — cap dependència GPL (es va provar
  `leaflet-rotate` per a la rotació tàctil del mapa i es va retirar, vegeu «Desviació de
  normativa»).
- **PWA (millora progressiva):** `manifest.json` + `sw.js` — cache-first per al shell,
  network-first amb reserva per als JSON del catàleg. **No es cachegen tessel·les de mapa**
  (política dels servidors públics d'OSM).

## Polit visual "professional" (branca `disseny-professional`, 13/09/2026)

A petició de l'usuari, fet en una branca a part (no a `main`) perquè sigui trivial desfer-ho
si no agrada. Res de nou al design-system — només aprofitar millor components que ja hi
eren i no s'utilitzaven a fons:

- **Barra lateral de la targeta acolorida per format** (`FORMAT_META.colorVar` a `ui.js`,
  reutilitzant els mateixos tokens de la insígnia): abans totes les targetes sortien amb la
  mateixa barra blava (`.ds-card--primary` fix), independentment del format. De pas, **bug
  trobat al `card.css` compartit**: `.ds-card--status-start::before` porta `background:
  var(--ds-color-primary)` fix — mai llegeix `--ds-card-color`, tot i que el comentari del
  mateix fitxer diu que hi hauria de combinar. Sobreescrit localment a `app.css`
  (`.aiwb-card.ds-card--status-start::before`); pendent de proposar el fix al design-system
  compartit.
- **Estats buits amb crida a l'acció** (`ui.js` → `emptyState(msg, icona, action)`, el
  `.ds-empty__action` del component ja existia a `empty.css` però no es feia servir enlloc):
  "Ara" sense esdeveniments avui i "Ruta" sense parades enllacen a "Explora"; a "Explora"
  sense resultats, un botó "Treu els filtres" (`resetFilters()`) neteja els 4 selects i els
  2 interruptors i torna a renderitzar.
- **Càrrega amb `.ds-spinner`** (ja importat, no es feia servir) en lloc de només text pla a
  "Ara", "Explora" i la fitxa.
- **Filtres d'Explora agrupats visualment** en un panell (`.aiwb-explora-toolbar` amb fons,
  vora i ombra) — abans 4 `<select>` flotant directament sobre el fons de la pàgina.
- **Capçalera:** el text "BOSTON AI WEEK 2026" en majúscules fixes al marcatge (no era CSS)
  canvia a "Boston AI Week 2026".

## Bugs reals de navegació SPA (13/09/2026)

Dos bugs relacionats, tots dos amb la mateixa arrel: `router.js` només substitueix
`#main-content` en navegar sense recàrrega — **mai toca el chrome** (capçalera, menús,
diàlegs fora de `#main-content`). Qualsevol element que calgui a una pantalla concreta però
que visqui fora de `#main-content` desapareix (o queda desactualitzat) en arribar-hi per clic
al menú, encara que funcioni perfectament en carregar la URL directa — per això **cap prova
amb `page.goto()` directe el va detectar** durant tot el desenvolupament; només una prova que
clica el menú de veritat el reprodueix.

- **Crash real reportat per l'usuari en producció**: `Cannot set properties of null (setting
  'textContent') at openVenueModal (mapa.js:54)`. Causa: `<dialog id="dlg-venue">` vivia FORA
  de `#main-content` a `mapa.html` (n'hi havia una còpia duplicada allà i una altra a dins).
  En navegar-hi amb el menú (en lloc de carregar `mapa.html` directament), la còpia de fora no
  existia mai al DOM — clicar un marcador petava. **Fix:** eliminada la còpia de fora;
  `dlg-venue` és específic del mapa, així que ha de viure DINS `#main-content` (a diferència de
  `dlg-nav`/`dlg-fitxa`/`dlg-plan`, comuns a les 5 pantalles, que sí que van fora). Verificat
  amb Playwright clicant el menú real (no `goto()`) abans i després del fix, i reproduït
  també contra la URL de producció abans d'aplicar-lo.
- **Bug trobat en investigar l'anterior, no reportat per l'usuari**: el botó "Ara/Planificar"
  (`btn-open-plan` + `dlg-plan`) i el subtítol dinàmic de la capçalera només existien a
  `ara.html`. En navegar a qualsevol altra pantalla pel menú (especialment rellevant ara que
  "Explora" és la pàgina d'entrada, no "Ara"), el botó de mode simplement desapareixia i el
  subtítol es quedava congelat amb el text d'"Ara" — sense cap error de consola (els guards
  interns ho amagaven). **Fix:** `btn-open-plan`/`dlg-plan` promoguts a chrome comú (afegits a
  `index.html`, `ruta.html`, `mapa.html`, `fitxa.html`, ja hi eren a `ara.html`); la lògica
  d'interruptor viu ara en un únic `js/planmode.js` compartit (es connecta un sol cop per
  sessió, guarda `dlg.__aiwbWired`, i emet l'event `aiwb:planmode-changed` quan canvia el
  mode). Subtítol: `id="aiwb-header-subtitle"` unificat a les 5 pàgines; cada `init()` de
  pàgina (`explora.js`, `ruta.js`, `mapa.js`, `fitxa.js`) ara el fixa explícitament amb el seu
  propi text en cada navegació (abans cap d'ells el tocava). `ara.js` ja no porta la seva
  pròpia còpia de la lògica d'interruptor (`wirePlanDialog()` eliminada); en lloc d'això
  escolta `aiwb:planmode-changed` i només torna a renderitzar quan la pantalla activa és
  realment "Ara" (comprovant que `#aiwb-ara-list` existeix al DOM en el moment de l'event).
  Verificat amb Playwright: canviar a mode "Planificar" des d'"Ara", navegar per tot l'app pel
  menú (el subtítol de cada pantalla es manté correcte i no es corromp) i tornar a "Ara" (el
  mode i la data/hora triats persisteixen via `localStorage`, com ja passava abans).

## Puntuació de rellevància personal (13/09/2026)

A petició de l'usuari: cada esdeveniment porta una "caixeta" a la targeta amb una
puntuació d'1 a 10 ("Rellevància per a tu") i exactament 3 aspectes curts que
l'expliquen (`renderEventCard`/`relevanceBox` a `js/modules/ui.js`), i Explora té un
selector d'ordenació nou ("Cronològic" / "Rellevància per a tu", `#aiwb-sort` a
`index.html` + `sortMode` a `explora.js`).

**Important, per no confondre-ho amb la resta de dades del catàleg (que sí que són
objectives i verificables — descripcions raspades, coordenades geocodificades):**
`relevanceScore`/`relevanceReasons` (`data/events.json`) són un **judici editorial fet
a mà per Claude, una sola vegada, sobre els 3 eixos d'interès d'una sola persona**
(«Decisions per defecte» més amunt) — **no** surt de cap font externa, no és una mètrica
objectiva, i no s'ha de presentar mai com si ho fos. Metodologia seguida: lectura del
títol + format + organitzador + `description` de cada un dels 173 esdeveniments,
puntuant més amunt contingut de governança/ètica/regulació d'IA, tallers o xerrades
tècniques d'enginyeria/agents, i casos d'ús aplicats reals; puntuant més avall el pur
networking/festes/sopars executius i el contingut centrat en vendes/finançament/VC
(eix explícitament exclòs). Esdeveniments recurrents de la mateixa sèrie (p. ex. "Boat
Rides", "MIT Future Fest", "BDMT Global Innovator Summit") reben la mateixa puntuació a
cada dia/instància, per coherència.

**Si es refà aquesta puntuació en el futur** (nous esdeveniments importats, o l'usuari
canvia d'interessos): reutilitza els 3 eixos ja fixats a «Decisions per defecte» sense
repreguntar-los, tret que l'usuari indiqui explícitament que han canviat. L'script
puntual fet servir (`apply-relevance.cjs`, no versionat — vivia al scratchpad de la
sessió) validava que el mapa de puntuacions cobrís exactament els ids d'`events.json`
(ni en faltés ni en sobrés cap) abans d'escriure.

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

Vegeu `INFORME_COBERTURA.md` i `data/coverage.json` per al detall complet. Resum:

- **173/173 esdeveniments** importats d'`aiweek.boston/schedule` (13/09/2026) — coincideix
  exactament amb el total que anunciava la web oficial en aquell moment. **Cap altra font**
  (Luma/Eventbrite/Meetup/Partiful) contrastada encara — pendent de ronda addicional.
- **116 seus úniques**: 1 virtual, 12 amb seu no revelada per l'organitzador (per disseny,
  no una dada que falti), 103 amb nom/adreça real. D'aquestes 103: **40 geocodificades**
  amb Nominatim (`coordinateStatus: "approximate"`, no verificades manualment) i **63
  encara sense resoldre** (no consten a OpenStreetMap amb aquest nom — típic d'oficines
  privades). **1 fals positiu detectat i corregit** ("Goodwin" → Newburyport en lloc del
  Seaport; mateix tipus d'error que el cas Botanika a `visaOffPerpinya`).
- **128 organitzadors**, classificats per tipus per patrons de nom (81 queden `other` per
  prudència, sense forçar cap categoria dubtosa).
- Cap `topic`/`audience`/`neighborhood` assignat encara.
