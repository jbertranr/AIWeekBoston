/* ============================================================
   js/mapa.js — pantalla "Mapa" (secundària). Un marcador per seu
   (no per esdeveniment), només seus amb coordenades geocodificades.
   Leaflet vendoritzat (1.9.3, fixat), tessel·les OSM carregades sota
   demanda (només en obrir aquesta pantalla) — mai precarregades en
   massa. Script clàssic + import() dinàmic (vegeu ara.js).
   ============================================================ */
(function () {
  let mods = null;
  let map = null;
  let clusterGroup = null; // agrupa els marcadors de seu (evita el clúster dens de 37/40 solapats)
  let markers = []; // { marker, group }
  let formatFilter = "tots";
  let youAreHereMarker = null;
  let youAreHereCircle = null;
  let youAreHereConeEl = null; // node DOM del con d'orientació (rotat directament, sense refer el marcador)
  let watchId = null; // seguiment en viu actiu (null = aturat)
  let stopHeading = null; // funció per aturar l'escolta de deviceorientation (null = aturat/no suportat)
  let liveFirstFix = true;
  let lastCompassHeading = null; // últim rumb rebut (graus des del nord real) — cal per recalcular el con quan el mapa mateix gira (leaflet-rotate)

  function wallClockNow() {
    const mode = mods.state.getPlanMode();
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      return mods.status.planAsBostonWallClock(dt.date, dt.time);
    }
    return mods.status.nowAsBostonWallClock();
  }

  function updateRouteBadge() {
    const badge = document.getElementById("aiwb-route-badge");
    if (!badge) return;
    const n = mods.state.getRoute().length;
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  // Fitxa dins d'un modal apilat sobre el del llistat de la seu — mateix
  // patró que ara.js/explora.js/ruta.js.
  function openFitxa(item) {
    const body = document.getElementById("dlg-fitxa-body");
    body.replaceChildren(mods.ui.buildFitxaCard(item, mods, { onRouteChange: updateRouteBadge }));
    document.getElementById("dlg-fitxa-title").textContent = item.title;
    if (window.DSModal) window.DSModal.obre("dlg-fitxa");
    else document.getElementById("dlg-fitxa").showModal();
    history.replaceState(null, "", `#ev=${encodeURIComponent(item.id)}`);
  }

  // En clicar un marcador: modal amb la llista d'esdeveniments d'aquella
  // seu (en lloc del popup nadiu de Leaflet amb un enllaç fora de la
  // pantalla).
  function openVenueModal(group) {
    document.getElementById("dlg-venue-title").textContent = group.venue.name;
    const body = document.getElementById("dlg-venue-body");
    body.replaceChildren();

    const meta = document.createElement("p");
    meta.className = "ds-text ds-text--sm ds-text--muted";
    const bits = [`${group.events.length} ${group.events.length === 1 ? "esdeveniment" : "esdeveniments"}`];
    if (group.venue.coordinateStatus === "approximate") bits.push("ubicació aproximada");
    meta.textContent = bits.join(" · ");
    body.append(meta);

    const wallClock = wallClockNow();
    const prefs = mods.state.getPrefs();
    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "var(--ds-space-2)";
    for (const item of group.events) {
      list.append(mods.ui.renderEventCard(item, {
        wallClock,
        startingSoonMinutes: prefs.startingSoonMinutes,
        onOpen: openFitxa
      }));
    }
    body.append(list);

    if (window.DSModal) window.DSModal.obre("dlg-venue");
    else document.getElementById("dlg-venue").showModal();
  }

  // Icona d'un color diferent segons el format (paleta local
  // definida a app.css / mods.ui.FORMAT_META); quan una seu barreja
  // esdeveniments de formats diferents, un color neutre propi ("mixed").
  function groupFormatKey(group) {
    const formats = new Set(group.events.map((e) => e.format));
    if (formats.size === 1) return mods.ui.formatMeta(formats.values().next().value).key;
    return "mixed";
  }

  function formatIcon(key) {
    return L.divIcon({
      className: `aiwb-map-marker aiwb-map-marker--${key}`,
      html: '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>',
      iconSize: [30, 30],
      iconAnchor: [15, 29],
      popupAnchor: [0, -26]
    });
  }

  // Bug real (13/09/2026): amb els ~40 marcadors de seu del catàleg real,
  // 37/40 queden a <24px els uns dels altres en la vista inicial (fitBounds
  // sobre tota l'àrea del festival) — el marcador de sobre intercepta el
  // clic dels de sota i sembla que "el clic no funciona". Solució: agrupar-
  // los amb Leaflet.markercluster (spiderfy en apropar-se prou) en lloc
  // d'afegir-los directament al mapa.
  function renderMarkers(catalog) {
    clusterGroup.clearLayers();
    markers = [];

    let events = catalog.events;
    if (formatFilter !== "tots") events = events.filter((e) => e.format === formatFilter);

    const groups = mods.data.groupByVenue(events).filter((g) => g.venue && g.venue.coordinates);

    for (const group of groups) {
      const marker = L.marker([group.venue.coordinates.lat, group.venue.coordinates.lng], {
        title: `${group.venue.name} (${group.events.length})`,
        icon: formatIcon(groupFormatKey(group))
      });
      marker.on("click", () => openVenueModal(group));
      clusterGroup.addLayer(marker);
      markers.push({ marker, group });
    }

    if (groups.length && markers.length) {
      const bounds = L.latLngBounds(groups.map((g) => [g.venue.coordinates.lat, g.venue.coordinates.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }

  // Marcadors fixos de Park + Ride (aparcaments grans de final de línia de
  // metro) — no depenen del catàleg d'esdeveniments ni del filtre de
  // format, sempre visibles, mai agrupats amb els de seu (són una capa de
  // referència, no un resultat de cerca).
  function parkAndRideIcon() {
    return L.divIcon({
      className: "aiwb-map-marker aiwb-map-marker--parkride",
      html: '<i class="fa-solid fa-square-parking" aria-hidden="true"></i>',
      iconSize: [28, 28],
      iconAnchor: [14, 26],
      popupAnchor: [0, -24]
    });
  }

  function openParkRideModal(pr) {
    document.getElementById("dlg-venue-title").textContent = pr.name;
    const body = document.getElementById("dlg-venue-body");
    body.replaceChildren();

    const meta = document.createElement("p");
    meta.className = "ds-text ds-text--sm ds-text--muted";
    const bits = ["Park + Ride", pr.line];
    if (pr.spaces) bits.push(`${pr.spaces.toLocaleString("ca")} places`);
    meta.textContent = bits.join(" · ");
    body.append(meta);

    if (pr.address) {
      const addr = document.createElement("p");
      addr.className = "ds-text ds-text--sm";
      addr.textContent = pr.address;
      body.append(addr);
    }

    const link = document.createElement("a");
    link.className = "ds-button ds-button--sm";
    link.href = `https://www.google.com/maps/dir/?api=1&destination=${pr.lat},${pr.lng}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Com arribar en cotxe";
    const linkIcon = document.createElement("i");
    linkIcon.className = "fa-solid fa-car";
    linkIcon.setAttribute("aria-hidden", "true");
    link.prepend(linkIcon, " ");
    body.append(link);

    if (window.DSModal) window.DSModal.obre("dlg-venue");
    else document.getElementById("dlg-venue").showModal();
  }

  async function renderParkAndRide() {
    let data;
    try {
      const res = await fetch(window.APP.dataFiles.parkAndRide, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.warn("[mapa] no s'ha pogut carregar park-and-ride.json", err);
      return;
    }
    for (const pr of data.parkAndRide || []) {
      if (typeof pr.lat !== "number" || typeof pr.lng !== "number") continue;
      const marker = L.marker([pr.lat, pr.lng], {
        title: `${pr.name} — Park + Ride`,
        icon: parkAndRideIcon(),
        zIndexOffset: 500
      });
      marker.on("click", () => openParkRideModal(pr));
      marker.addTo(map);
    }
  }

  function wireFilters(catalog) {
    const select = document.getElementById("aiwb-map-filter-format");
    if (!select) return;
    select.addEventListener("change", () => {
      formatFilter = select.value;
      renderMarkers(catalog);
    });
  }

  // El marcador es crea UN SOP COP i després només es mou (setLatLng), en
  // lloc de refer-lo a cada posició nova: necessari perquè el con
  // d'orientació (rotatHeading()) pugui actualitzar-se moltes vegades per
  // segon sense parpellejar ni perdre la referència DOM.
  function placeYouAreHere(loc) {
    if (youAreHereMarker) {
      youAreHereMarker.setLatLng([loc.lat, loc.lng]);
      youAreHereCircle.setLatLng([loc.lat, loc.lng]).setRadius(loc.accuracyM);
      return;
    }
    youAreHereMarker = L.marker([loc.lat, loc.lng], {
      icon: L.divIcon({
        className: "aiwb-map-you-are-here-wrap",
        html: '<div class="aiwb-map-you-are-here__cone"></div><div class="aiwb-map-you-are-here"></div>',
        iconSize: [84, 84],
        iconAnchor: [42, 42]
      }),
      zIndexOffset: 1000,
      title: "La teva ubicació",
      // Bug real (13/09/2026): la caixa de 84x84 és sobretot transparent
      // (només s'hi veuen el punt i el con), però Leaflet la fa clicable
      // sencera per defecte — quan la ubicació cau sobre (o a prop de) un
      // clúster o una altra seu, bloquejava els seus clics encara que
      // visualment no s'hi veiés res al damunt. No cal que el propi punt
      // sigui clicable.
      interactive: false
    }).addTo(map);
    youAreHereConeEl = youAreHereMarker.getElement().querySelector(".aiwb-map-you-are-here__cone");
    youAreHereCircle = L.circle([loc.lat, loc.lng], {
      radius: loc.accuracyM, color: "#1857c4", weight: 1, fillOpacity: 0.08
    }).addTo(map);
  }

  // Gira el con d'orientació (com el con blau de Google Maps) cap a on
  // apunta el dispositiu. Actualitza directament l'estil del node DOM
  // (no refà el marcador) — es crida molt sovint, un cop per cada event
  // deviceorientation. Bug real (13/09/2026): posar només `rotate(Xdeg)`
  // esborra el `translate(-50%, -50%)` de app.css que centra el con sobre
  // el punt (els estils inline reemplacen TOT `transform`, no el sumen) —
  // el con quedava desplaçat mig con (42px) cap avall-dreta. Cal repetir
  // el translate a cada actualització.
  //
  // El rumb del dispositiu és sempre respecte al nord real, però amb
  // leaflet-rotate el mapa mateix es pot girar amb dos dits — si no es
  // descompta la rotació pròpia del mapa (map.getBearing()), el con
  // apuntaria a una direcció incorrecta EN PANTALLA en quant algú giri el
  // mapa (encara que el mòbil no s'hagi mogut). applyConeRotation() és
  // qui aplica aquesta resta; es crida tant en rebre un rumb nou com quan
  // el mapa gira (esdeveniment "rotate" de leaflet-rotate).
  function applyConeRotation() {
    if (!youAreHereConeEl || lastCompassHeading == null) return;
    const bearing = map && map.getBearing ? map.getBearing() : 0;
    const screenDeg = (lastCompassHeading - bearing + 360) % 360;
    youAreHereConeEl.style.transform = `translate(-50%, -50%) rotate(${screenDeg}deg)`;
  }

  function rotateHeading(deg) {
    lastCompassHeading = deg;
    applyConeRotation();
  }

  function clearYouAreHere() {
    if (youAreHereMarker) { map.removeLayer(youAreHereMarker); youAreHereMarker = null; }
    if (youAreHereCircle) { map.removeLayer(youAreHereCircle); youAreHereCircle = null; }
    youAreHereConeEl = null;
    lastCompassHeading = null;
  }

  // Aturar el seguiment — cridat en parar manualment (clic al botó) i en
  // sortir de la pantalla "Mapa" (vegeu init()): "sota demanda, mai en
  // segon pla" (norma del projecte) vol dir que un watchPosition actiu no
  // pot sobreviure a la navegació cap a una altra pantalla.
  function stopLiveTracking() {
    if (watchId != null && mods && mods.geo) {
      mods.geo.stopWatchingLocation(watchId);
    }
    watchId = null;
    if (stopHeading) { stopHeading(); stopHeading = null; }
    const btn = document.getElementById("btn-map-locate");
    if (btn) {
      btn.classList.remove("is-tracking");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Mostra la meva ubicació al mapa en viu");
      const icon = btn.querySelector("i");
      if (icon) icon.className = "fa-solid fa-location-crosshairs";
    }
  }

  // Ubicació en viu (mai a l'arrencada — només quan l'usuari prem el
  // botó): un punt blau que es va actualitzant amb watchPosition mentre
  // estigui activat. El primer punt rebut centra/apropa el mapa; els
  // següents només mouen el punt (no torna a centrar sol, per no
  // "estirar" el mapa si l'usuari l'ha desplaçat manualment). Prement el
  // botó una segona vegada s'atura i s'amaga el punt.
  function wireLocate() {
    const btn = document.getElementById("btn-map-locate");
    const statusEl = document.getElementById("aiwb-map-locate-status");
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (watchId != null) {
        stopLiveTracking();
        clearYouAreHere();
        statusEl.hidden = true;
        return;
      }

      statusEl.hidden = true;
      const icon = btn.querySelector("i");
      icon.className = "fa-solid fa-spinner fa-spin";
      liveFirstFix = true;

      // Orientació (con estil Google Maps) — millora progressiva: si no hi
      // ha suport, si l'usuari denega el permís (iOS) o si el navegador
      // només dona una orientació relativa (no referenciada al nord), la
      // ubicació en viu segueix funcionant igual, només sense con.
      mods.geo.watchHeading(rotateHeading).then((stop) => { stopHeading = stop; });

      watchId = mods.geo.watchLocation(
        (loc) => {
          icon.className = "fa-solid fa-location-crosshairs";
          btn.classList.add("is-tracking");
          btn.setAttribute("aria-pressed", "true");
          btn.setAttribute("aria-label", "Seguiment en viu activat — prem per aturar-lo");
          placeYouAreHere(loc);
          if (liveFirstFix) {
            map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 15));
            liveFirstFix = false;
          }
          statusEl.hidden = loc.accuracyM <= 100;
          if (!statusEl.hidden) statusEl.textContent = `Precisió baixa (±${Math.round(loc.accuracyM)} m).`;
        },
        (err) => {
          // Només un error PERMANENT (permís denegat) para el seguiment.
          // "unavailable"/"timeout" són transitoris (GPS sense senyal un
          // moment, xarxa lenta...): el watchPosition natiu del navegador
          // segueix actiu tot sol i tornarà a cridar amb la següent
          // posició vàlida — aturar-lo aquí el trencaria innecessàriament.
          if (err.code === "denied") {
            stopLiveTracking();
          }
          statusEl.textContent = err.code === "denied"
            ? `No s'ha pogut activar el seguiment: ${err.messageCa}`
            : `Ubicació momentàniament no disponible: ${err.messageCa}`;
          statusEl.hidden = false;
        }
      );
    });
  }

  async function init() {
    const mapEl = document.getElementById("aiwb-map");
    if (!mapEl) {
      // Hem navegat cap a una altra pantalla: #aiwb-map ja no existeix al
      // DOM (router.js ha substituït #main-content). Un watchPosition
      // actiu no s'atura sol — cal parar-lo aquí explícitament (norma
      // "sota demanda, mai en segon pla").
      stopLiveTracking();
      return;
    }
    if (typeof L === "undefined") return;
    // Guarda SÍNCRONA (abans de qualsevol await) — vegeu el comentari
    // equivalent a visaOffPerpinya/js/mapa.js: evita "Map container is
    // already initialized" quan init() es crida dues vegades seguides.
    if (mapEl.dataset.aiwbMapInit) return;
    mapEl.dataset.aiwbMapInit = "1";

    if (!mods) {
      const [status, geo, data, stateMod, ui] = await Promise.all([
        import("./modules/status.js"),
        import("./modules/geo.js"),
        import("./modules/data.js"),
        import("./modules/state.js"),
        import("./modules/ui.js")
      ]);
      mods = { status, geo, data, state: stateMod, ui };
    }

    updateRouteBadge();
    wireLocate();

    // rotate/touchRotate (leaflet-rotate, GPL-3.0 — vegeu index.md): gest
    // de dos dits per girar el mapa, com Google Maps. rotateControl amb
    // closeOnZeroBearing (per defecte del plugin) mostra una brúixola
    // petita NOMÉS quan el mapa està girat, que en tocar-la torna al nord
    // — s'amaga sola a 0°, no afegeix soroll visual quan no es fa servir.
    map = L.map(mapEl, { zoomControl: true, rotate: true, touchRotate: true, rotateControl: { position: "topleft" } });
    map.setView([window.APP.bostonSeaportRef.lat, window.APP.bostonSeaportRef.lng], 13);
    map.on("rotate", applyConeRotation);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "aiwb-map-tiles-soft",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contribuïdors d\'OpenStreetMap</a>'
    }).addTo(map);

    clusterGroup = L.markerClusterGroup({ maxClusterRadius: 50, spiderfyOnMaxZoom: true, showCoverageOnHover: false });
    map.addLayer(clusterGroup);

    renderParkAndRide();

    try {
      const { catalog } = await mods.data.loadCatalog();
      wireFilters(catalog);
      renderMarkers(catalog);
    } catch (err) {
      console.error("[mapa] no s'ha pogut carregar el catàleg", err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
