/* ============================================================
   js/backup.js — còpia de seguretat de preferits/"hi vaig"/ruta
   (dlg-nav, chrome comú a les 5 pantalles).

   Motiu (13/09/2026): l'usuari va perdre tots els preferits — Safari a
   iOS/Mac esborra l'emmagatzematge local (localStorage) dels llocs que
   no s'obren en uns quants dies (Intelligent Tracking Prevention). Com
   que aquesta app no té backend per disseny (norma web-vanilla, guia
   personal sense compte d'usuari), tota la selecció viu només al
   navegador — aquest botó permet baixar-ne una còpia en JSON i
   restaurar-la si Safari (o qualsevol altra cosa) l'esborra.

   Script clàssic + import() dinàmic (mateix patró que planmode.js).
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

  const REMINDER_DAYS = 3;
  const REMINDER_DISMISSED_KEY = "aiWeekBoston:recordatoriTancat";

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  async function doBackup() {
    const m = await ensureMods();
    const data = {
      app: "aiWeekBoston",
      exportedAt: new Date().toISOString(),
      favorites: Array.from(m.state.favoriteIds()),
      attendance: Array.from(m.state.attendingIds()),
      route: m.state.getRoute()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aiweekboston-copia-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    m.state.setLastBackupAt(new Date().toISOString());
    hideReminder();
  }

  function hideReminder() {
    const slot = document.getElementById("aiwb-backup-reminder");
    if (slot) slot.replaceChildren();
  }

  // Recordatori suau (13/09/2026): sense backend no hi ha manera de fer la
  // còpia real "automàtica" (no hi ha núvol on desar-la) — això és el
  // màxim que es pot fer sense afegir-ne un: avisar si fa dies que no
  // se n'ha fet cap i encara hi ha res per perdre. Es mostra un sol cop
  // per pestanya/sessió (sessionStorage, no localStorage — es vol que
  // torni a sortir la propera vegada que s'obri l'app si segueix vençut).
  async function maybeShowReminder() {
    const slot = document.getElementById("aiwb-backup-reminder");
    if (!slot || slot.childElementCount > 0) return;
    if (sessionStorage.getItem(REMINDER_DISMISSED_KEY)) return;

    const m = await ensureMods();
    const total = m.state.favoriteIds().size + m.state.attendingIds().size + m.state.getRoute().length;
    if (total === 0) return;

    const lastBackup = m.state.getLastBackupAt();
    const daysSince = lastBackup ? (Date.now() - new Date(lastBackup).getTime()) / 86400000 : Infinity;
    if (daysSince < REMINDER_DAYS) return;

    const alert = document.createElement("div");
    alert.className = "ds-alert ds-alert--warn ds-alert--dismissible";
    alert.setAttribute("role", "status");

    const icon = document.createElement("i");
    icon.className = "ds-alert__icon fa-solid fa-triangle-exclamation";
    icon.setAttribute("aria-hidden", "true");
    alert.append(icon);

    const body = document.createElement("div");
    body.className = "ds-alert__body";
    const title = document.createElement("p");
    title.className = "ds-alert__title";
    title.textContent = "Fes una còpia dels teus preferits";
    const text = document.createElement("p");
    text.textContent = lastBackup
      ? `Fa ${Math.floor(daysSince)} dies que no en fas cap — Safari pot esborrar-los si no obres l'app sovint.`
      : "Encara no n'has fet cap — Safari pot esborrar-los si no obres l'app sovint.";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "ds-button ds-button--sm";
    saveBtn.style.marginTop = "var(--ds-space-2)";
    saveBtn.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i> Desa una còpia ara';
    saveBtn.addEventListener("click", doBackup);
    body.append(title, text, saveBtn);
    alert.append(body);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "ds-icon-button ds-alert__close";
    closeBtn.setAttribute("aria-label", "Tanca l'avís");
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    closeBtn.addEventListener("click", () => {
      sessionStorage.setItem(REMINDER_DISMISSED_KEY, "1");
      hideReminder();
    });
    alert.append(closeBtn);

    slot.append(alert);
  }

  async function doRestore(file) {
    const m = await ensureMods();
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (err) {
      window.alert("El fitxer triat no és un JSON vàlid.");
      return;
    }
    if (!data || typeof data !== "object") {
      window.alert("El fitxer no té el format esperat.");
      return;
    }
    const favorites = Array.isArray(data.favorites) ? data.favorites : [];
    const attendance = Array.isArray(data.attendance) ? data.attendance : [];
    const route = Array.isArray(data.route) ? data.route : [];

    const ok = window.confirm(
      `Es restauraran ${favorites.length} preferits, ${attendance.length} "hi vaig" i ` +
      `${route.length} esdeveniments a la ruta — reemplaçarà el que tinguis ara mateix ` +
      `en aquest navegador. Vols continuar?`
    );
    if (!ok) return;

    m.state.setFavoriteIds(favorites);
    m.state.setAttendingIds(attendance);
    m.state.setRoute(route);
    m.state.setLastBackupAt(new Date().toISOString());
    window.alert("Còpia restaurada. La pàgina es tornarà a carregar.");
    location.reload();
  }

  function wire() {
    const backupBtn = document.getElementById("btn-backup-save");
    const restoreBtn = document.getElementById("btn-backup-restore");
    const fileInput = document.getElementById("aiwb-backup-file");
    // Mateix contracte que planmode.js: dlg-nav és chrome, router.js no el
    // toca mai en navegar sense recàrrega, així que només cal connectar-lo
    // un sol cop per sessió.
    if (!backupBtn || !restoreBtn || !fileInput || backupBtn.__aiwbWired) return;
    backupBtn.__aiwbWired = true;

    backupBtn.addEventListener("click", doBackup);
    restoreBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      fileInput.value = "";
      if (file) doRestore(file);
    });
  }

  function init() {
    wire();
    maybeShowReminder();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
