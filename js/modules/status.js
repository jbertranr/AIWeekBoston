/* ============================================================
   modules/status.js
   Estat temporal d'un esdeveniment puntual en un instant donat,
   sempre en horari America/New_York — independentment de la zona
   horària del dispositiu. A diferència d'una exposició (horari
   continu, "obert/tancat"), un esdeveniment de Boston AI Week té
   una hora d'inici (i, sovint, de fi) fixa: els estats són "encara
   no ha començat" (amb un comptador), "comença aviat" (llindar
   configurable), "en curs" i "acabat".

   Treballa sempre amb "hora de paret" de Nova York
   ({dateStr, minutesOfDay}), no amb un Date/instant: així el mode
   "Planificar" (l'usuari tria una data i hora ja pensades com a
   hora de Boston) no necessita cap conversió d'UTC↔EDT/EST, i el
   mode "Ara" només en fa una, en un sol punt (nowAsBostonWallClock).
   ============================================================ */

const BOSTON_TZ = "America/New_York";

/** Converteix l'instant real (Date) a hora de paret de America/New_York. */
export function nowAsBostonWallClock() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOSTON_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  const parts = {};
  fmt.formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    minutesOfDay: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10)
  };
}

/** Mode Planificar: l'usuari ja tria data/hora pensades com a hora de Boston. */
export function planAsBostonWallClock(dateStr, hhmm) {
  return { dateStr, minutesOfDay: toMinutes(hhmm || "10:00") };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toUTCDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetween(fromStr, toStr) {
  return Math.round((toUTCDay(toStr) - toUTCDay(fromStr)) / 86400000);
}

/** "180" → "3h", "185" → "3h 5min", "40" → "40 min", "2900" → "2 dies". */
function formatMinutesUntil(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  if (totalMinutes < 24 * 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  const days = Math.floor(totalMinutes / 1440);
  return `${days} ${days === 1 ? "dia" : "dies"}`;
}

/**
 * @param {object} event — amb date/startTime/endTime (startTime/endTime poden ser null)
 * @param {{dateStr:string, minutesOfDay:number}} bostonWallClock
 * @param {number} startingSoonMinutes — llindar de "comença aviat" (preferència, no dada del programa)
 * @returns {{state: string, label: string, icon: string}}
 */
export function computeStatus(event, bostonWallClock, startingSoonMinutes) {
  if (!event.date) {
    return { state: "desconegut", label: "Data no confirmada", icon: "fa-solid fa-circle-question" };
  }

  const { dateStr, minutesOfDay } = bostonWallClock;

  // Dia ja passat: acabat, independentment de l'hora.
  if (dateStr > event.date) {
    return { state: "acabat", label: "Acabat", icon: "fa-solid fa-flag-checkered" };
  }

  if (!event.startTime) {
    return { state: "desconegut", label: "Horari no confirmat", icon: "fa-solid fa-circle-question" };
  }

  const startMin = toMinutes(event.startTime);
  const endMin = event.endTime ? toMinutes(event.endTime) : null;

  // Dia futur (no avui): compte enrere fins a l'inici.
  if (dateStr < event.date) {
    const daysUntil = daysBetween(dateStr, event.date);
    const totalMinutesUntil = daysUntil * 1440 - minutesOfDay + startMin;
    if (totalMinutesUntil <= startingSoonMinutes) {
      return { state: "comença-aviat", label: `Comença aviat (${totalMinutesUntil} min)`, icon: "fa-solid fa-clock" };
    }
    return { state: "proper", label: `Comença en ${formatMinutesUntil(totalMinutesUntil)}`, icon: "fa-solid fa-hourglass-start" };
  }

  // Avui, encara no ha començat.
  if (minutesOfDay < startMin) {
    const diff = startMin - minutesOfDay;
    if (diff <= startingSoonMinutes) {
      return { state: "comença-aviat", label: `Comença aviat (${diff} min)`, icon: "fa-solid fa-clock" };
    }
    return { state: "proper", label: `Comença en ${formatMinutesUntil(diff)}`, icon: "fa-solid fa-hourglass-start" };
  }

  // Avui, ja ha començat.
  if (endMin != null) {
    if (minutesOfDay < endMin) {
      return { state: "en-curs", label: "En curs", icon: "fa-solid fa-circle-check" };
    }
    return { state: "acabat", label: "Acabat", icon: "fa-solid fa-flag-checkered" };
  }

  // Ha començat i no hi ha hora de fi coneguda: es dona per en curs la
  // resta del dia (mai s'inventa una durada) fins que canviï la data.
  return { state: "en-curs", label: "En curs (durada no confirmada)", icon: "fa-solid fa-circle-check" };
}

/** Classe .ds-status--* que correspon a cada estat, per pintar-lo. */
export function statusVariant(state) {
  switch (state) {
    case "en-curs": return "ok";
    case "comença-aviat": return "warn";
    case "acabat": return "danger";
    case "proper":
    case "desconegut":
    default: return "";
  }
}

/** Ordre de rellevància temporal per a la pantalla "Ara": en curs primer,
    després comença-aviat, després proper, després desconegut, acabat al final. */
export function statusSortRank(state) {
  switch (state) {
    case "en-curs": return 0;
    case "comença-aviat": return 1;
    case "proper": return 2;
    case "desconegut": return 3;
    case "acabat": return 4;
    default: return 5;
  }
}
