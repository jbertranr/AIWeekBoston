/* ============================================================
   js/explora.js — pantalla "Explora": cerca + filtres sobre tot
   el catàleg. Script clàssic + import() dinàmic (vegeu ara.js).
   ============================================================ */
(function () {
  let mods = null;
  let catalog = null;
  let filters = { day: "", format: "", neighborhood: "", organizerId: "", preferits: false, pendents: false, triats: false };
  let sortMode = "chrono";

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

  function openFitxa(item) {
    const body = document.getElementById("dlg-fitxa-body");
    if (!body) {
      location.href = `fitxa.html?id=${encodeURIComponent(item.id)}`;
      return;
    }
    body.replaceChildren(mods.ui.buildFitxaCard(item, mods, { onRouteChange: updateRouteBadge }));
    document.getElementById("dlg-fitxa-title").textContent = item.title;
    if (window.DSModal) window.DSModal.obre("dlg-fitxa");
    else document.getElementById("dlg-fitxa").showModal();
    history.replaceState(null, "", `#ev=${encodeURIComponent(item.id)}`);
  }

  function render() {
    const list = document.getElementById("aiwb-explora-list");
    const countEl = document.getElementById("aiwb-results-count");
    if (!list || !catalog) return;
    list.replaceChildren();

    const wallClock = wallClockNow();
    const prefs = mods.state.getPrefs();

    let results = catalog.events.filter((item) => {
      if (filters.day && item.date !== filters.day) return false;
      if (filters.format && item.format !== filters.format) return false;
      if (filters.neighborhood && (!item.venue || item.venue.neighborhood !== filters.neighborhood)) return false;
      if (filters.organizerId && item.organizerId !== filters.organizerId) return false;
      if (filters.preferits && !mods.state.isFavorite(item)) return false;
      if (filters.pendents && mods.state.isAttending(item)) return false;
      if (filters.triats && !mods.state.isAttending(item)) return false;
      return true;
    });

    if (sortMode === "relevance") {
      results.sort((a, b) => {
        const as = a.relevanceScore ?? 0;
        const bs = b.relevanceScore ?? 0;
        if (as !== bs) return bs - as;
        const ad = `${a.date} ${a.startTime || "99:99"}`;
        const bd = `${b.date} ${b.startTime || "99:99"}`;
        return ad.localeCompare(bd);
      });
    } else {
      results.sort((a, b) => {
        const ad = `${a.date} ${a.startTime || "99:99"}`;
        const bd = `${b.date} ${b.startTime || "99:99"}`;
        if (ad !== bd) return ad.localeCompare(bd);
        return a.title.localeCompare(b.title, "ca");
      });
    }

    countEl.textContent = `${results.length} ${results.length === 1 ? "esdeveniment" : "esdeveniments"}`;

    if (results.length === 0) {
      list.append(mods.ui.emptyState(
        "Cap esdeveniment coincideix amb els filtres.",
        "fa-solid fa-magnifying-glass",
        { label: "Treu els filtres", icon: "fa-solid fa-filter-circle-xmark", onClick: resetFilters }
      ));
      return;
    }

    for (const item of results) {
      list.append(mods.ui.renderEventCard(item, {
        wallClock,
        startingSoonMinutes: prefs.startingSoonMinutes,
        onOpen: openFitxa,
        onToggleFavorite: () => { if (filters.preferits) render(); }
      }));
    }
  }

  function resetFilters() {
    filters = { day: "", format: "", neighborhood: "", organizerId: "", preferits: false, pendents: false, triats: false };
    ["aiwb-filter-day", "aiwb-filter-format", "aiwb-filter-neighborhood", "aiwb-filter-organizer"].forEach((id) => {
      const sel = document.getElementById(id);
      if (sel) sel.value = "";
    });
    ["btn-filter-preferits", "btn-filter-pendents", "btn-filter-triats"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.add("ds-button--ghost");
    });
    render();
  }

  function wireFilters() {
    const toggle = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", () => {
        filters[key] = !filters[key];
        btn.classList.toggle("ds-button--ghost", !filters[key]);
        render();
      });
    };
    toggle("btn-filter-preferits", "preferits");
    toggle("btn-filter-pendents", "pendents");
    toggle("btn-filter-triats", "triats");

    const daySelect = document.getElementById("aiwb-filter-day");
    daySelect.addEventListener("change", () => { filters.day = daySelect.value; render(); });

    const formatSelect = document.getElementById("aiwb-filter-format");
    formatSelect.addEventListener("change", () => { filters.format = formatSelect.value; render(); });

    const neighborhoodSelect = document.getElementById("aiwb-filter-neighborhood");
    neighborhoodSelect.addEventListener("change", () => { filters.neighborhood = neighborhoodSelect.value; render(); });

    const organizerSelect = document.getElementById("aiwb-filter-organizer");
    organizerSelect.addEventListener("change", () => { filters.organizerId = organizerSelect.value; render(); });

    const sortSelect = document.getElementById("aiwb-sort");
    sortSelect.addEventListener("change", () => { sortMode = sortSelect.value; render(); });
  }

  // Només valors que realment apareixen al catàleg, ordenats.
  function populateDayFilter() {
    const select = document.getElementById("aiwb-filter-day");
    if (!select || !catalog) return;
    const days = Array.from(new Set(catalog.events.map((e) => e.date).filter(Boolean))).sort();
    for (const d of days) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      select.append(opt);
    }
  }

  function populateNeighborhoodFilter() {
    const select = document.getElementById("aiwb-filter-neighborhood");
    if (!select || !catalog) return;
    const counts = new Map();
    for (const ev of catalog.events) {
      const n = ev.venue && ev.venue.neighborhood;
      if (!n) continue;
      counts.set(n, (counts.get(n) || 0) + 1);
    }
    const neighborhoods = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, "ca"));
    for (const n of neighborhoods) {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = `${n} (${counts.get(n)})`;
      select.append(opt);
    }
  }

  function populateOrganizerFilter() {
    const select = document.getElementById("aiwb-filter-organizer");
    if (!select || !catalog) return;
    const counts = new Map();
    for (const ev of catalog.events) {
      if (!ev.organizerId) continue;
      counts.set(ev.organizerId, (counts.get(ev.organizerId) || 0) + 1);
    }
    const organizers = catalog.organizers
      .filter((o) => counts.has(o.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ca"));
    for (const o of organizers) {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = `${o.name} (${counts.get(o.id)})`;
      select.append(opt);
    }
  }

  async function init() {
    const list = document.getElementById("aiwb-explora-list");
    if (!list) return;

    const subtitle = document.getElementById("aiwb-header-subtitle");
    if (subtitle) subtitle.textContent = "Explora · tot el catàleg";

    if (!mods) {
      const [storage, status, geo, data, stateMod, ui] = await Promise.all([
        import("./modules/storage.js"),
        import("./modules/status.js"),
        import("./modules/geo.js"),
        import("./modules/data.js"),
        import("./modules/state.js"),
        import("./modules/ui.js")
      ]);
      mods = { storage, status, geo, data, state: stateMod, ui };
    }

    updateRouteBadge();
    wireFilters();

    const params = new URLSearchParams(location.search);

    try {
      const { catalog: c } = await mods.data.loadCatalog();
      catalog = c;
      populateDayFilter();
      populateNeighborhoodFilter();
      populateOrganizerFilter();

      const dayParam = params.get("day");
      if (dayParam) {
        document.getElementById("aiwb-filter-day").value = dayParam;
        filters.day = dayParam;
      }
      const formatParam = params.get("format");
      if (formatParam) {
        document.getElementById("aiwb-filter-format").value = formatParam;
        filters.format = formatParam;
      }
      render();
    } catch (err) {
      list.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg.", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
