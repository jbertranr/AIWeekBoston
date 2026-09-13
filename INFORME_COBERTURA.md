# Informe de cobertura de dades — Boston AI Week 2026

Aquest informe documenta, amb el mateix rigor que el de `visaOffPerpinya`, què s'ha
verificat, d'on surt cada dada i què queda pendent. Cap xifra d'aquest document s'ha
arrodonit ni inventat.

## Resum

| Font | Esdeveniments trobats | Importats | Amb descripció real | Seus geocodificades |
|---|---|---|---|---|
| aiweek.boston/schedule (oficial) | 173 | **173/173** | 170/173 | 93/103 amb nom real (aprox.) |

**Esdeveniments: 173/173 importats** — coincideix exactament amb el total que la pròpia
web oficial anunciava ("173 events approved") el 13/09/2026. **Cap altra font agregadora
s'ha contrastat encara** (Luma, Eventbrite, Meetup, Partiful) — vegeu «Pendent» més avall.

## Mètode d'importació

1. Es va confirmar el nom oficial, organitzador i dates de l'edició (`aiweek.boston/about`):
   Boston AI Week 2026, produït per Judah Phillips (acte comunitari independent), 16/09–28/10
   (setmana nucli 24/09–2/10).
2. Es va extreure el llistat complet d'`aiweek.boston/schedule` (13/09/2026): 173 files amb
   títol, organitzador, data, hora, seu, format, cost i URL de detall.
3. Cada fila s'ha parsejat automàticament (títol / organitzador / data / hora / seu / format
   / cost / URL) — **0 files sense reconèixer** sobre 173.
4. L'`id` de cada esdeveniment és el segment final de la seva pròpia URL oficial (ja únic
   per disseny del lloc font) — mai un identificador inventat.
5. Format normalitzat a un vocabulari comú (`Summit/Panel/Workshop/Talk/Meetup/Conference/
   Hackathon/DemoNight/Community/Other`); canvis fets: "Demo Night"→"DemoNight",
   "Keynote"→"Talk" (1 cas), "Career"→"Other" (1 cas), "Competition"→"Other" (1 cas).

## Organitzadors — 128 entitats úniques

Classificats per tipus (startup/universitat/empresa/vc/coworking/comunitat/públic/media/
other) per **patrons coneguts del nom** (p. ex. "University"/"Institute of Technology" →
universitat; "AWS"/"Microsoft"/"Google"/"Deloitte" → empresa; "Ventures"/"Capital" → vc;
"Workbar"/"CIC"/"Venture Café" → coworking). **81/128 queden com `other`** perquè no hi ha
prou senyal al nom per classificar-los amb confiança — no s'ha forçat cap categoria dubtosa.

## Seus — 116 entrades úniques

- **1 virtual** (esdeveniments en línia, sense seu física — `coordinateStatus:
  "not-applicable"`, mai coordenades inventades).
- **11 amb seu explícitament no revelada** per l'organitzador ("TBA", "Location revealed
  upon registration approval", "Venue location disclosed to confirmed guests"…) — és així
  per disseny de l'organitzador, no una dada que falti; es manté `pending` sense forçar cap
  valor. **Cap d'aquestes es geocodifica encara que Nominatim retorni un resultat**: si la
  consulta neta acaba sent només "Boston, MA" (perquè no hi ha cap adreça real darrere), es
  descarta expressament — mostrar un pin al centre geomètric de la ciutat suggeriria una
  precisió que no existeix (vegeu actualització 13/09/2026 més avall).
- **104 amb nom/adreça real** intentades a Nominatim (`nominatim.openstreetmap.org`, 1
  petició/segon, `User-Agent` identificat, comprovació de distància al centre de Boston per
  descartar falsos positius — mateixa precaució que a Visa+OFF, on una cerca per adreça va
  confondre carrers homònims de pobles veïns):
  - **93 geocodificades** (`coordinateStatus: "approximate"` — **no verificat manualment**
    portal a portal, per això no es marca `"verified"`).
  - **11 encara sense resoldre** després de tres passades (vegeu metodologia sota). La
    majoria són seus explicades amb text lliure sense adreça reconstruïble ("private venue
    in Brighton, exact address provided to approved attendees") o oficines/sales que no
    consten a OpenStreetMap amb aquell nom (`the-quin-house`, `macpaw-hq`…). Cadascuna guarda
    a `notesCa` les variants de consulta provades.
  - **0 falsos positius detectats** (llindar de 70 km respecte al centre de Boston).

## Actualització 13/09/2026 — descripcions reals + 2a/3a passada de geocodificació

A petició explícita de l'usuari en detectar que cap fitxa d'esdeveniment mostrava descripció
(el camp `topic` mai es va omplir en origen — la pàgina llistat no el donava, com ja deia
aquest informe). Es va comprovar que **cada esdeveniment té la seva pròpia fitxa individual**
a `aiweek.boston/schedule/<id>` (el mateix `sourceUrl` que ja teníem) amb una secció "About"
i, a "Location", l'adreça real de la seu (que la pàgina llistat no dona) — dues dades que
faltaven i que sí que existeixen a la font oficial, no calia inventar-les:

- **Descripcions** (`events.json[].description`, camp nou): raspades les 173 fitxes
  individuals. **170/173 amb text real**; 2 amb el placeholder del mateix lloc ("Details
  coming soon. Add this event to your calendar and check back.") — es manté sense
  `description` (missatge honest "Encara no hi ha una descripció" a la UI, no es mostra el
  placeholder aliè); 1 sense secció "About" a la fitxa. Alguns textos originals barrejaven
  marcatge HTML (enllaços d'inscripció dins el paràgraf) — es converteix a text pla conservant
  el text visible, mai `innerHTML` amb dades externes (norma web-vanilla).
- **Geocodificació, 2a passada**: la mateixa fitxa individual porta un enllaç a Google Maps
  amb la consulta "\<nom seu\>, \<adreça\>" ja combinada pel propi lloc — molt més precisa que
  el sol nom de la seu (única dada disponible a la 1a passada, documentada més amunt). Amb
  aquesta adreça, moltes consultes seguien fallant per soroll (pisos, sales, sufixos "LLP",
  adreces duplicades al text) — Nominatim és molt sensible a text extra.
- **Geocodificació, 3a passada**: neteja de la consulta (parèntesis, "Suite/Floor/Room/Unit
  \<núm\>", primer segment si sembla nom propi) + extracció per patró "número + carrer, ciutat,
  MA \[cp\]" quan hi és enterrada enmig de soroll.
- **Resultat combinat (2a+3a)**: de **40 a 93 seus geocodificades** (+53) sobre les 104 amb
  nom real. **4 resultats descartats manualment** perquè Nominatim només va poder resoldre
  "Boston, MA" genèric (sense adreça real darrere): 3 seus placeholder
  (`pendent-greater-boston-venue-tba`, `pendent-venue-location-disclosed-to-confirmed-gu`,
  `pendent-location-disclosed-to-confirmed-guests`) i **1 seu real** (`the-quin-house`, un
  club privat de Boston del qual la fitxa no dona adreça pròpia) — es prefereix deixar-los
  `pending` (honest) abans que mostrar un pin fals al centre de la ciutat.

## Pendent (properes iteracions, no assumit ara)

- Contrastar aiweek.boston amb Luma / Eventbrite / Meetup / Partiful per si hi ha
  esdeveniments no llistats al lloc oficial (l'encàrrec avisa explícitament que aquesta
  mena de setmanes solen tenir cobertura fragmentada entre múltiples plataformes).
- Resoldre manualment les 11 seus reals encara pendents (adreça postal exacta des de la web
  del mateix organitzador).
- Assignar barri (`neighborhood`) a les seus ja geocodificades.
- Classificar `audience` de cada esdeveniment (el llistat font no el donava de manera
  consistent; `topic` ja no cal — substituït per `description`, vegeu actualització
  13/09/2026).
- Repetir la importació periòdicament — el lloc oficial afegeix esdeveniments cada
  setmana ("New events added weekly").
