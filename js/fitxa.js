/* ============================================================
   js/fitxa.js — fitxa d'un esdeveniment (?id=…), com a pàgina
   pròpia: és el fallback real i el punt d'entrada per a enllaç
   directe / compartir (les altres pantalles l'obren com a modal amb
   el mateix contingut, construït per ui.js#buildFitxaCard — vegeu
   ara.js/explora.js/ruta.js/mapa.js).
   Script clàssic + import() dinàmic (vegeu ara.js).
   ============================================================ */
(function () {
  let mods = null;

  async function init() {
    const container = document.getElementById("aiwb-fitxa-content");
    if (!container) return;

    const subtitle = document.getElementById("aiwb-header-subtitle");
    if (subtitle) subtitle.textContent = "Fitxa d'esdeveniment";

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

    const badgeEl = document.getElementById("aiwb-route-badge");
    const updateRouteBadge = () => {
      if (!badgeEl) return;
      const n = mods.state.getRoute().length;
      badgeEl.hidden = n === 0;
      badgeEl.textContent = String(n);
    };
    updateRouteBadge();

    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    try {
      const { catalog } = await mods.data.loadCatalog();
      const item = catalog.events.find((e) => e.id === id);
      if (!item) {
        container.replaceChildren(mods.ui.emptyState("No s'ha trobat aquest esdeveniment al catàleg.", "fa-solid fa-circle-question"));
        return;
      }
      document.title = `${item.title} · Boston AI Week 2026`;
      container.replaceChildren(mods.ui.buildFitxaCard(item, mods, { onRouteChange: updateRouteBadge }));
    } catch (err) {
      container.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg.", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
