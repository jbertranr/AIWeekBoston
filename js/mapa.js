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
  let markers = []; // { marker, group }
  let formatFilter = "tots";
  let youAreHereMarker = null;
  let youAreHereCircle = null;

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

  function renderMarkers(catalog) {
    markers.forEach((m) => map.removeLayer(m.marker));
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
      marker.addTo(map);
      markers.push({ marker, group });
    }

    if (groups.length && markers.length) {
      const bounds = L.latLngBounds(groups.map((g) => [g.venue.coordinates.lat, g.venue.coordinates.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
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

  // Ubicació sota demanda (mai a l'arrencada, mateix patró que ara.js):
  // un punt blau al mapa + cercle de precisió, i centra/apropa el mapa
  // a la ubicació. Es pot tornar a clicar per actualitzar-la.
  function wireLocate() {
    const btn = document.getElementById("btn-map-locate");
    const statusEl = document.getElementById("aiwb-map-locate-status");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      statusEl.hidden = true;
      const icon = btn.querySelector("i");
      icon.className = "fa-solid fa-spinner fa-spin";
      try {
        const loc = await mods.geo.requestLocation();
        if (youAreHereMarker) map.removeLayer(youAreHereMarker);
        if (youAreHereCircle) map.removeLayer(youAreHereCircle);
        youAreHereMarker = L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({ className: "aiwb-map-you-are-here", iconSize: [16, 16], iconAnchor: [8, 8] }),
          zIndexOffset: 1000,
          title: "La teva ubicació"
        }).addTo(map);
        youAreHereCircle = L.circle([loc.lat, loc.lng], {
          radius: loc.accuracyM, color: "#1857c4", weight: 1, fillOpacity: 0.08
        }).addTo(map);
        map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 15));
        if (loc.accuracyM > 100) {
          statusEl.textContent = `Precisió baixa (±${Math.round(loc.accuracyM)} m).`;
          statusEl.hidden = false;
        }
      } catch (err) {
        statusEl.textContent = `No s'ha pogut obtenir la ubicació: ${err.messageCa}`;
        statusEl.hidden = false;
      } finally {
        btn.disabled = false;
        icon.className = "fa-solid fa-location-crosshairs";
      }
    });
  }

  async function init() {
    const mapEl = document.getElementById("aiwb-map");
    if (!mapEl || typeof L === "undefined") return;
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

    map = L.map(mapEl, { zoomControl: true });
    map.setView([window.APP.bostonSeaportRef.lat, window.APP.bostonSeaportRef.lng], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "aiwb-map-tiles-soft",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contribuïdors d\'OpenStreetMap</a>'
    }).addTo(map);

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
