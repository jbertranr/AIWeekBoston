/* ============================================================
   js/ara.js — pantalla "Ara" (vista inicial)

   Script CLÀSSIC (no type="module") a propòsit: router.js recrea
   els <script src> en la navegació sense recàrrega però no en
   conserva l'atribut type, així que un <script type="module">
   trencaria en tornar a aquesta pantalla. En canvi, import()
   dinàmic funciona igual des d'un script clàssic — per això la
   lògica real viu en mòduls carregats amb import() dins d'aquesta
   IIFE, que només s'executa una vegada (el "ds:navigated" fa la
   resta, com mana el contracte de router.js).

   A diferència de "A prop" (visaOffPerpinya), aquí no s'agrupa per
   seu ni es fa servir geolocalització: el criteri és purament
   temporal — només els esdeveniments del dia que s'està mirant (avui
   en mode "Ara", el dia triat en mode "Planificar"), ordenats per
   rellevància (en curs / comença aviat / proper / desconegut / acabat).
   ============================================================ */
(function () {
  let mods = null;
  let state = { catalog: null, onlyFavorites: false, onlyPending: false };

  function wallClockNow() {
    const mode = mods.state.getPlanMode();
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      return mods.status.planAsBostonWallClock(dt.date, dt.time);
    }
    return mods.status.nowAsBostonWallClock();
  }

  function updateHeaderDate() {
    const mode = mods.state.getPlanMode();
    const label = document.getElementById("aiwb-header-date");
    if (!label) return;
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      label.textContent = `Planificant · ${dt.date} ${dt.time}`;
    } else {
      const wc = mods.status.nowAsBostonWallClock();
      label.textContent = `Ara · ${wc.dateStr}, ${String(Math.floor(wc.minutesOfDay / 60)).padStart(2, "0")}:${String(wc.minutesOfDay % 60).padStart(2, "0")} (hora de Boston)`;
    }
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
    const container = document.getElementById("aiwb-ara-list");
    if (!container || !state.catalog) return;
    container.replaceChildren();

    const wc = wallClockNow();
    const prefs = mods.state.getPrefs();

    let events = state.catalog.events.filter((ev) => ev.date === wc.dateStr);
    if (state.onlyFavorites) events = events.filter((ev) => mods.state.isFavorite(ev));
    if (state.onlyPending) events = events.filter((ev) => !mods.state.isAttending(ev));

    if (events.length === 0) {
      container.append(mods.ui.emptyState(
        `No hi ha cap esdeveniment per al ${wc.dateStr} amb aquest filtre.`,
        "fa-solid fa-calendar-xmark",
        { label: "Explora tot el catàleg", href: "index.html", icon: "fa-solid fa-magnifying-glass" }
      ));
      return;
    }

    const withStatus = events.map((ev) => ({
      item: ev,
      status: mods.status.computeStatus(ev, wc, prefs.startingSoonMinutes)
    }));
    withStatus.sort((a, b) => {
      const rankDiff = mods.status.statusSortRank(a.status.state) - mods.status.statusSortRank(b.status.state);
      if (rankDiff !== 0) return rankDiff;
      const at = a.item.startTime || "99:99";
      const bt = b.item.startTime || "99:99";
      return at.localeCompare(bt);
    });

    for (const { item } of withStatus) {
      container.append(mods.ui.renderEventCard(item, {
        wallClock: wc,
        startingSoonMinutes: prefs.startingSoonMinutes,
        onOpen: openFitxa,
        onToggleFavorite: () => { if (state.onlyFavorites) render(); }
      }));
    }
  }

  function wirePlanDialog() {
    const dlg = document.getElementById("dlg-plan");
    const openBtn = document.getElementById("btn-open-plan");
    const btnAra = document.getElementById("btn-mode-ara");
    const btnPlan = document.getElementById("btn-mode-planificar");
    const fields = document.getElementById("aiwb-plan-fields");
    const dateInput = document.getElementById("aiwb-plan-date");
    const timeInput = document.getElementById("aiwb-plan-time");
    if (!dlg || !openBtn) return;

    const dt = mods.state.getPlanDateTime();
    dateInput.value = dt.date;
    timeInput.value = dt.time;

    function reflectMode() {
      const mode = mods.state.getPlanMode();
      btnAra.classList.toggle("ds-button--ghost", mode !== "ara");
      btnPlan.classList.toggle("ds-button--ghost", mode !== "planificar");
      fields.hidden = mode !== "planificar";
      updateHeaderDate();
    }

    openBtn.addEventListener("click", () => {
      if (window.DSModal) window.DSModal.obre("dlg-plan");
      else dlg.showModal();
    });
    btnAra.addEventListener("click", () => { mods.state.setPlanMode("ara"); reflectMode(); render(); });
    btnPlan.addEventListener("click", () => { mods.state.setPlanMode("planificar"); reflectMode(); render(); });
    dateInput.addEventListener("change", () => { mods.state.setPlanDateTime({ ...mods.state.getPlanDateTime(), date: dateInput.value }); reflectMode(); render(); });
    timeInput.addEventListener("change", () => { mods.state.setPlanDateTime({ ...mods.state.getPlanDateTime(), time: timeInput.value }); reflectMode(); render(); });

    reflectMode();
  }

  function wireExtraFilters() {
    const toggle = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", () => {
        state[key] = !state[key];
        btn.classList.toggle("ds-button--ghost", !state[key]);
        render();
      });
    };
    toggle("btn-filter-preferits", "onlyFavorites");
    toggle("btn-filter-pendents", "onlyPending");
  }

  async function init() {
    const container = document.getElementById("aiwb-ara-list");
    if (!container) return; // pantalla incorrecta (contracte router.js)

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

    updateHeaderDate();
    updateRouteBadge();
    wirePlanDialog();
    wireExtraFilters();

    try {
      const { catalog, fromCache } = await mods.data.loadCatalog();
      state.catalog = catalog;
      if (fromCache) {
        const notice = document.createElement("p");
        notice.className = "ds-text ds-text--sm ds-text--muted";
        notice.textContent = "Sense connexió: mostrant l'última còpia desada del catàleg.";
        container.before(notice);
      }
      render();
    } catch (err) {
      container.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg (sense connexió i sense còpia desada).", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
