# Informe de cobertura de dades — Boston AI Week 2026

Aquest informe documenta, amb el mateix rigor que el de `visaOffPerpinya`, què s'ha
verificat, d'on surt cada dada i què queda pendent. Cap xifra d'aquest document s'ha
arrodonit ni inventat.

## Resum

| Font | Esdeveniments trobats | Importats | Seus geocodificades |
|---|---|---|---|
| aiweek.boston/schedule (oficial) | 173 | **173/173** | 40/103 amb nom real (aprox.) |

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
- **12 amb seu explícitament no revelada** per l'organitzador ("TBA", "Location revealed
  upon registration approval", "Venue location disclosed to confirmed guests"…) — és així
  per disseny de l'organitzador, no una dada que falti; es manté `pending` sense forçar cap
  valor.
- **103 amb nom/adreça real** intentades a Nominatim (`nominatim.openstreetmap.org`, 1
  petició/segon, `User-Agent` identificat, cercades dins un requadre de Massachusetts i amb
  comprovació de distància al centre de Boston per descartar falsos positius — mateixa
  precaució que a Visa+OFF, on una cerca per adreça va confondre carrers homònims de pobles
  veïns):
  - **40 geocodificades** (`coordinateStatus: "approximate"` — resultat automàtic d'una
    sola consulta, **no verificat manualment** portal a portal, per això no es marca
    `"verified"`).
  - **63 sense resoldre**, fins i tot després d'una segona passada amb variants de la
    consulta (sense sufixos legals, sense parèntesis, extraient el tram d'adreça postal si
    n'hi havia). En la majoria de casos són oficines privades d'empreses o comerços petits
    que **no consten a OpenStreetMap amb aquest nom** — no és un error del procés de cerca,
    és un límit real de la font de mapes gratuïta. Cadascuna guarda a `notesCa` les variants
    de consulta provades, per si una revisió manual amb l'adreça postal exacta (extreta de
    la web del mateix organitzador) les pot resoldre.
  - **0 falsos positius detectats** en aquesta ronda (llindar de 70 km respecte al centre de
    Boston) — a diferència de Visa+OFF, on 6 resultats sí que calia descartar.

## Pendent (properes iteracions, no assumit ara)

- Contrastar aiweek.boston amb Luma / Eventbrite / Meetup / Partiful per si hi ha
  esdeveniments no llistats al lloc oficial (l'encàrrec avisa explícitament que aquesta
  mena de setmanes solen tenir cobertura fragmentada entre múltiples plataformes).
- Resoldre manualment les 63 seus pendents (adreça postal exacta des de la web de
  l'organitzador).
- Assignar barri (`neighborhood`) a les seus ja geocodificades.
- Classificar `topic`/`audience` de cada esdeveniment (el llistat font no els donava de
  manera consistent).
- Repetir la importació periòdicament — el lloc oficial afegeix esdeveniments cada
  setmana ("New events added weekly").
