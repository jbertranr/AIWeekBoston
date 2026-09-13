# Boston AI Week 2026

Guia de butxaca **independent** (no oficial) de tots els esdeveniments de la **Boston AI
Week 2026**. HTML/CSS/JS amb mòduls, 100% estàtica — cap backend, cap base de dades
remota, cap servei de pagament.

**Estat: esquelet acabat de crear, catàleg encara buit.** Vegeu
[`INFORME_COBERTURA.md`](INFORME_COBERTURA.md) — la recerca de dades reals és una tasca
separada, encara no iniciada.

## Executar en local

Qualsevol servidor HTTP estàtic serveix — cap build, cap `npm install`:

```bash
cd 99_test/prj_ai_week_boston/aplicacions/aiWeekBoston
python -m http.server 8918
# → http://localhost:8918/
```

O des de `panell` (:4321): targeta *Boston AI Week 2026* → «Obrir».

La geolocalització real (a «Ruta» i «Mapa») només funciona amb **HTTPS** o a `localhost`.

## Actualitzar el catàleg

1. Edita o substitueix `data/organizers.json` / `venues.json` / `events.json`, mantenint
   el mateix esquema (ids estables, mai la posició) — detall a [`index.md`](index.md).
2. `node validate-catalog.cjs` — comprova referències trencades, ids duplicats i
   coordenades fora de l'àrea de Boston.
3. Actualitza `data/coverage.json` i `INFORME_COBERTURA.md` amb els comptadors reals.
4. No cal tocar cap HTML/JS — tota la lògica llegeix el catàleg per `fetch`.

## Estructura

```
index.html / ara.html / ruta.html / mapa.html / fitxa.html   → les 5 pantalles (index.html = "Explora", pàgina d'entrada)
js/config.js                → configuració (window.APP)
js/modules/                 → mòduls ES reals (dades, estat temporal, geo, estat, UI)
js/{ara,explora,ruta,mapa,fitxa}.js  → un script per pantalla (import() dinàmic)
data/*.json                 → catàleg (font única, mai al codi) — buit de moment
assets/css/                 → còpia local del design-system compartit + app.css propi
assets/vendor/leaflet1.9.3/ → Leaflet vendoritzat (fixat, sense CDN)
manifest.json, sw.js        → PWA
validate-catalog.cjs        → validador d'integritat del catàleg
```

Detall d'arquitectura, decisions i desviacions de normativa: [`index.md`](index.md).
Normativa aplicada: `web-vanilla` (`_wiki-intern/normatives/norm-web-vanilla.md`).
Projecte de referència (mateix patró arquitectònic): `visaOffPerpinya`.

## Limitacions conegudes

- Catàleg completament buit (`data/*.json` amb `[]`) — la recerca de dades reals encara no
  ha començat.
- Icona d'aplicació (`assets/icons/icon.svg`): monograma neutre inventat — **no** cap
  logotip real de Boston AI Week ni de cap organitzador.
- El mapa i la geolocalització necessiten connexió i (en producció) HTTPS.
