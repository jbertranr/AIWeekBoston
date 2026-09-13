/* ============================================================
   js/planmode.js — interruptor "Ara / Planificar" (dlg-plan),
   compartit per les 5 pantalles.

   Bug real (13/09/2026): abans només existia a ara.html. Com que
   router.js no toca mai la capçalera/chrome en navegar sense
   recàrrega (només #main-content), en arribar a qualsevol altra
   pantalla via el menú (per exemple des d'"Explora", que ara és la
   pàgina d'entrada) el botó simplement no hi era — sense error, però
   sense manera d'activar el mode "Planificar" tret que es carregués
   ara.html directament. Com que el mode afecta els càlculs d'estat
   temporal de TOTES les pantalles (cadascuna llegeix
   state.getPlanMode() al seu propi wallClockNow()), calia que el
   control fos comú, no exclusiu d'"Ara".

   Script clàssic + import() dinàmic (mateix patró que ara.js/
   explora.js) perquè router.js el pugui recarregar sense trencar-se
   en navegar-hi repetidament.
   ============================================================ */
(function () {
  let mods = null;

  async function ensureMods() {
    if (!mods) {
      const stateMod = await import("./modules/state.js");
      mods = { state: stateMod };
    }
    return mods;
  }

  function reflectMode(m) {
    const btnAra = document.getElementById("btn-mode-ara");
    const btnPlan = document.getElementById("btn-mode-planificar");
    const fields = document.getElementById("aiwb-plan-fields");
    if (!btnAra || !btnPlan || !fields) return;
    const mode = m.state.getPlanMode();
    btnAra.classList.toggle("ds-button--ghost", mode !== "ara");
    btnPlan.classList.toggle("ds-button--ghost", mode !== "planificar");
    fields.hidden = mode !== "planificar";
  }

  async function wire() {
    const dlg = document.getElementById("dlg-plan");
    const openBtn = document.getElementById("btn-open-plan");
    // La capçalera (i per tant dlg-plan/btn-open-plan) no la toca mai
    // router.js, així que un cop connectat a la primera pàgina
    // carregada sencera, el mateix node sobreviu a totes les
    // navegacions sense recàrrega — no cal (ni s'ha de) tornar-lo a
    // connectar cada vegada que es crida wire() via "ds:navigated".
    if (!dlg || !openBtn || dlg.__aiwbWired) return;
    dlg.__aiwbWired = true;

    const m = await ensureMods();
    const btnAra = document.getElementById("btn-mode-ara");
    const btnPlan = document.getElementById("btn-mode-planificar");
    const dateInput = document.getElementById("aiwb-plan-date");
    const timeInput = document.getElementById("aiwb-plan-time");

    const dt = m.state.getPlanDateTime();
    dateInput.value = dt.date;
    timeInput.value = dt.time;
    reflectMode(m);

    function notifyChange() {
      reflectMode(m);
      // Cada pantalla que vulgui reaccionar al canvi (p. ex. ara.js
      // torna a renderir i actualitza el rellotge de la capçalera
      // quan la pantalla activa és "Ara") escolta aquest event —
      // desacoblat, no cal que planmode.js conegui cap altra pantalla.
      document.dispatchEvent(new CustomEvent("aiwb:planmode-changed"));
    }

    openBtn.addEventListener("click", () => {
      if (window.DSModal) window.DSModal.obre("dlg-plan");
      else dlg.showModal();
    });
    btnAra.addEventListener("click", () => { m.state.setPlanMode("ara"); notifyChange(); });
    btnPlan.addEventListener("click", () => { m.state.setPlanMode("planificar"); notifyChange(); });
    dateInput.addEventListener("change", () => {
      m.state.setPlanDateTime({ ...m.state.getPlanDateTime(), date: dateInput.value });
      notifyChange();
    });
    timeInput.addEventListener("change", () => {
      m.state.setPlanDateTime({ ...m.state.getPlanDateTime(), time: timeInput.value });
      notifyChange();
    });
  }

  function init() { wire(); }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
