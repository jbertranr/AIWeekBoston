/* ============================================================
   modules/ui.js
   Peces d'interfície reutilitzables entre pantalles: targeta
   d'esdeveniment, grup per seu, distintiu de format i píndola
   d'estat temporal. La lògica de dades (com es calcula l'estat, com
   es resolen les referències) viu als altres mòduls — aquí només hi
   ha construcció de DOM, sense innerHTML amb dades del catàleg
   (norma web-vanilla).

   Convenció de noms d'aquest fitxer (i dels scripts de pàgina que en
   depenen): l'objecte de domini "esdeveniment" es diu sempre `item`
   als paràmetres — mai `event`, per no confondre'l amb un DOM Event.
   ============================================================ */

import { computeStatus, statusVariant } from "./status.js";
import { isFavorite, isAttending, toggleFavorite } from "./state.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Capçalera de secció amb icona (blocs "Quan i on" / "Inscripció" / "Font
// i verificació" de la fitxa) — text sempre fix de la interfície, mai
// dades del catàleg, per això és segur construir-la amb createElement en
// lloc de haver de passar-hi per el()/textContent element a element.
function sectionHeading(icon, text) {
  const h2 = document.createElement("h2");
  const i = document.createElement("i");
  i.className = icon;
  i.setAttribute("aria-hidden", "true");
  h2.append(i, document.createTextNode(" " + text));
  return h2;
}

const MONTHS_CA = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];

export function formatEventDate(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} de ${MONTHS_CA[m - 1]}`;
}

export function formatEventDateTime(item) {
  const datePart = formatEventDate(item.date);
  if (!item.startTime) return `${datePart} · hora per confirmar`;
  return `${datePart} · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`;
}

// Metadades visuals per format d'esdeveniment (icona + classe de color
// local, definides a app.css — no són components nous del design-system
// compartit, només una paleta pròpia d'aquesta app per distingir 9
// formats al mapa i als distintius de les targetes).
// colorVar: mateix token que fa servir la insígnia de format (app.css
// .aiwb-badge--<key>) — reutilitzat per acolorir la barra lateral de la
// targeta (--ds-card-color, components/card.css) perquè cada format es
// distingeixi d'un cop d'ull sense haver de llegir la insígnia.
export const FORMAT_META = {
  Summit: { key: "summit", label: "Summit", icon: "fa-solid fa-mountain", colorVar: "--ds-color-primary" },
  Panel: { key: "panel", label: "Panel", icon: "fa-solid fa-comments", colorVar: "--ds-color-accent" },
  Workshop: { key: "workshop", label: "Workshop", icon: "fa-solid fa-screwdriver-wrench", colorVar: "--ds-color-success" },
  Talk: { key: "talk", label: "Talk", icon: "fa-solid fa-microphone", colorVar: "--aiwb-color-talk" },
  Meetup: { key: "meetup", label: "Meetup", icon: "fa-solid fa-people-group", colorVar: "--aiwb-color-meetup" },
  Conference: { key: "conference", label: "Conference", icon: "fa-solid fa-chalkboard-user", colorVar: "--aiwb-color-conference" },
  Hackathon: { key: "hackathon", label: "Hackathon", icon: "fa-solid fa-laptop-code", colorVar: "--aiwb-color-hackathon" },
  DemoNight: { key: "demonight", label: "Demo Night", icon: "fa-solid fa-display", colorVar: "--aiwb-color-demonight" },
  Community: { key: "community", label: "Community", icon: "fa-solid fa-people-roof", colorVar: "--aiwb-color-community" },
  Other: { key: "other", label: "Altres", icon: "fa-solid fa-circle-question", colorVar: "--ds-color-muted" }
};

export function formatMeta(format) {
  return FORMAT_META[format] || FORMAT_META.Other;
}

export function formatBadge(format) {
  const meta = formatMeta(format);
  const b = el("span", `ds-badge ds-badge--sm aiwb-badge--${meta.key}`);
  const icon = document.createElement("i");
  icon.className = meta.icon;
  icon.setAttribute("aria-hidden", "true");
  b.append(icon, document.createTextNode(" " + meta.label));
  return b;
}

export function statusPill(item, wallClock, startingSoonMinutes) {
  const status = computeStatus(item, wallClock, startingSoonMinutes);
  const variant = statusVariant(status.state);
  const span = el("span", `ds-status${variant ? ` ds-status--${variant}` : ""}`);
  const dot = el("span", "ds-status__dot");
  const icon = document.createElement("i");
  icon.className = status.icon;
  icon.setAttribute("aria-hidden", "true");
  span.append(dot, icon, document.createTextNode(" " + status.label));
  span.dataset.state = status.state;
  return { node: span, status };
}

function organizerLabel(item) {
  if (item.organizer && item.organizer.name) return item.organizer.name;
  if (item.organizerNameRaw) return item.organizerNameRaw;
  return "Organitzador per confirmar";
}

function costLabel(cost) {
  switch (cost) {
    case "free": return "Gratuït";
    case "paid": return "De pagament";
    case "invite-only": return "Només amb invitació";
    default: return null;
  }
}

function recordStatusLabel(recordStatus) {
  if (recordStatus === "pending") return "Pendent de confirmar";
  if (recordStatus === "tentative") return "Provisional";
  return null;
}

// Enllaç real cap a la fitxa, compartit entre tots els punts clicables
// de la targeta — deixa passar clic amb modificador / botó central
// (obrir en pestanya nova ha de funcionar com en qualsevol enllaç).
function fitxaHref(item) {
  return `fitxa.html?id=${encodeURIComponent(item.id)}`;
}
function wireCardNavigate(a, item, onOpen) {
  a.href = fitxaHref(item);
  a.setAttribute("data-no-router", ""); // router.js no l'ha de tractar com una navegació de pàgina
  a.addEventListener("click", (domEvent) => {
    if (domEvent.defaultPrevented || domEvent.button !== 0 || domEvent.metaKey || domEvent.ctrlKey || domEvent.shiftKey || domEvent.altKey) return;
    domEvent.preventDefault();
    onOpen(item);
  });
}

/**
 * Targeta compacta d'esdeveniment (llista "Ara" dins d'un grup, o
 * resultats d'"Explora"). onOpen(item) es crida en fer clic.
 */
export function renderEventCard(item, { wallClock, startingSoonMinutes, onOpen, onToggleFavorite }) {
  const card = el("div", "ds-card ds-card--status-start aiwb-card");
  card.setAttribute("data-event-id", item.id);
  // Barra lateral acolorida segons el format (vegeu FORMAT_META.colorVar) —
  // en lloc del blau fix de .ds-card--primary, perquè les targetes es
  // distingeixin d'un cop d'ull en una llista llarga.
  card.style.setProperty("--ds-card-color", `var(${formatMeta(item.format).colorVar})`);

  const top = el("div", "aiwb-card__top");
  top.append(formatBadge(item.format));
  const recordLabel = recordStatusLabel(item.recordStatus);
  if (recordLabel) top.append(el("span", "ds-badge ds-badge--sm ds-badge--warn", recordLabel));
  if (isAttending(item)) {
    const att = document.createElement("i");
    att.className = "fa-solid fa-circle-check aiwb-card__attending";
    att.setAttribute("aria-hidden", "true");
    att.title = "Hi vaig";
    top.append(att);
  }

  // Preferit: tocable directament des de la targeta, sense obrir la fitxa.
  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "aiwb-card__fav-btn";
  function reflectFav() {
    const fav = isFavorite(item);
    favBtn.innerHTML = `<i class="fa-${fav ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`;
    favBtn.classList.toggle("is-active", fav);
    favBtn.setAttribute("aria-pressed", String(fav));
    favBtn.setAttribute("aria-label", fav ? `Treure ${item.title} de preferits` : `Afegir ${item.title} a preferits`);
  }
  reflectFav();
  favBtn.addEventListener("click", (domEvent) => {
    domEvent.stopPropagation();
    toggleFavorite(item);
    reflectFav();
    if (onToggleFavorite) onToggleFavorite(item);
  });
  top.append(favBtn);

  const body = document.createElement("a");
  body.className = "aiwb-card__body";
  wireCardNavigate(body, item, onOpen);

  const text = el("div", "aiwb-card__text");
  text.append(el("p", "aiwb-card__title", item.title));
  text.append(el("p", "aiwb-card__organizer", organizerLabel(item)));
  if (item.topic) {
    text.append(el("p", "aiwb-card__topic", item.topic));
  }

  const timeLine = el("p", "aiwb-card__time");
  const cal = document.createElement("i");
  cal.className = "fa-solid fa-calendar-day";
  cal.setAttribute("aria-hidden", "true");
  timeLine.append(cal, document.createTextNode(" " + formatEventDateTime(item)));
  text.append(timeLine);

  if (item.venue) {
    const venueLine = el("p", "aiwb-card__venue");
    const pin = document.createElement("i");
    pin.className = "fa-solid fa-location-dot";
    pin.setAttribute("aria-hidden", "true");
    venueLine.append(pin);
    const venueText = el("span", "aiwb-card__venue-text");
    venueText.append(el("span", "aiwb-card__venue-name", item.venue.name));
    if (item.venue.neighborhood) venueText.append(el("span", "aiwb-card__venue-neighborhood", item.venue.neighborhood));
    venueLine.append(venueText);
    text.append(venueLine);
  }

  if (wallClock) {
    const { node } = statusPill(item, wallClock, startingSoonMinutes);
    node.classList.add("aiwb-card__status");
    text.append(node);
  }
  body.append(text);
  card.append(top, body);

  return card;
}

/**
 * Grup d'esdeveniments per seu — capçalera amb nom, distància i
 * comptador, sense repetir l'adreça a cada targeta filla.
 */
export function renderVenueGroup(group, { wallClock, startingSoonMinutes, onOpen, onToggleFavorite, distanceLabel }) {
  const wrap = el("section", "aiwb-venue-group");
  const header = el("div", "aiwb-venue-group__header");

  const title = el("p", "aiwb-venue-group__title", group.venue ? group.venue.name : "Seu per confirmar");
  header.append(title);

  const meta = el("p", "aiwb-venue-group__meta");
  const bits = [];
  if (distanceLabel) bits.push(distanceLabel);
  bits.push(`${group.events.length} ${group.events.length === 1 ? "esdeveniment" : "esdeveniments"}`);
  if (group.venue && group.venue.coordinateStatus === "approximate") {
    bits.push("ubicació aproximada");
  }
  meta.textContent = bits.join(" · ");
  header.append(meta);

  wrap.append(header);

  const list = el("div", "aiwb-venue-group__list");
  for (const item of group.events) {
    list.append(renderEventCard(item, { wallClock, startingSoonMinutes, onOpen, onToggleFavorite }));
  }
  wrap.append(list);
  return wrap;
}

function fitxaOrganizerBlock(item) {
  const wrap = el("div");
  wrap.append(el("p", "aiwb-fitxa__organizer", organizerLabel(item)));
  if (item.organizer && item.organizer.url) {
    const a = document.createElement("a");
    a.href = item.organizer.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "ds-text ds-text--sm";
    a.textContent = `Web de ${item.organizer.name} →`;
    wrap.append(a);
  }
  return wrap;
}

function fitxaLocationBlock(item) {
  const wrap = el("div", "aiwb-fitxa__block");
  wrap.append(sectionHeading("fa-solid fa-calendar-days", "Quan i on"));

  wrap.append(el("p", "ds-text", formatEventDateTime(item)));

  if (!item.venue) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Seu encara pendent de confirmar."));
  } else {
    wrap.append(el("p", "aiwb-fitxa__venue-name", item.venue.name));
    const addrBits = [item.venue.address, item.venue.neighborhood].filter(Boolean);
    if (addrBits.length) wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", addrBits.join(", ")));
    if (item.venue.coordinateStatus === "approximate") {
      wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Ubicació aproximada."));
    } else if (item.venue.coordinateStatus === "pending") {
      wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Ubicació encara pendent de geocodificar."));
    }
  }

  const costText = costLabel(item.cost);
  if (costText) wrap.append(el("p", "ds-text ds-text--sm", costText));
  if (item.audience) wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", `Públic: ${item.audience}`));

  return wrap;
}

function fitxaRegistrationBlock(item) {
  const wrap = el("div", "aiwb-fitxa__block");
  wrap.append(sectionHeading("fa-solid fa-ticket", "Inscripció"));
  if (item.registrationUrl) {
    const a = document.createElement("a");
    a.className = "ds-button ds-button--sm";
    a.href = item.registrationUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("data-no-router", "");
    a.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Inscriu-te';
    wrap.append(a);
  } else if (item.registrationRequired) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Cal inscripció prèvia — encara no hi ha enllaç disponible."));
  } else {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Sense inscripció prèvia coneguda."));
  }
  return wrap;
}

function fitxaSourcesBlock(item) {
  const wrap = el("div", "aiwb-fitxa__block");
  wrap.append(sectionHeading("fa-solid fa-shield-check", "Font i verificació"));
  if (item.sourceUrl) {
    const a = document.createElement("a");
    a.href = item.sourceUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "ds-text ds-text--sm";
    a.style.display = "block";
    a.textContent = item.sourceUrl;
    wrap.append(a);
  }
  if (item.retrievalMethod) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", `Mètode d'obtenció: ${item.retrievalMethod}`));
  }
  if (item.notesCa) wrap.append(el("p", "ds-text ds-text--sm", item.notesCa));
  return wrap;
}

// Text de la secció "About" raspat de la fitxa pròpia de l'esdeveniment a
// aiweek.boston (camp `description`, no confondre amb `topic`, que la web
// font mai va donar de manera consistent — vegeu INFORME_COBERTURA.md).
// Es respecten els salts de paràgraf originals (separats per línia en blanc).
function fitxaDescriptionBlock(item) {
  const wrap = el("div", "aiwb-fitxa__description");
  const text = item.description || item.topic;
  if (!text) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Encara no hi ha una descripció d'aquest esdeveniment."));
    return wrap;
  }
  text.split(/\n{2,}/).forEach((para) => {
    const trimmed = para.trim();
    if (trimmed) wrap.append(el("p", "ds-text", trimmed));
  });
  return wrap;
}

/**
 * Construeix el contingut complet de la fitxa d'un esdeveniment (bullets +
 * títol + organitzador + tema + accions + quan/on + inscripció + fonts),
 * reutilitzat tant per fitxa.html (pàgina pròpia, accessible per URL) com
 * pel modal obert des de les altres pantalles. `onRouteChange` s'invoca
 * quan canvia la ruta (perquè qui l'ha obert pugui refrescar el seu propi
 * comptador).
 */
export function buildFitxaCard(item, mods, { onRouteChange } = {}) {
  const card = el("div", "aiwb-fitxa-card");

  const bullets = el("div", "aiwb-fitxa__bullets");
  bullets.append(formatBadge(item.format));

  const wc = mods.state.getPlanMode() === "planificar"
    ? mods.status.planAsBostonWallClock(mods.state.getPlanDateTime().date, mods.state.getPlanDateTime().time)
    : mods.status.nowAsBostonWallClock();
  const prefs = mods.state.getPrefs();
  const { node: statusNode } = statusPill(item, wc, prefs.startingSoonMinutes);
  bullets.append(statusNode);
  bullets.append(el("span", "aiwb-fitxa__bullets-spacer"));

  const attendBtn = document.createElement("button");
  attendBtn.type = "button";
  attendBtn.className = "aiwb-fitxa__bullet-btn";
  function reflectAttend() {
    const a = isAttending(item);
    attendBtn.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>';
    attendBtn.classList.toggle("is-active", a);
    attendBtn.setAttribute("aria-pressed", String(a));
    attendBtn.setAttribute("aria-label", a ? "Marcat com a 'hi vaig'" : "Marca com a 'hi vaig'");
  }
  attendBtn.addEventListener("click", () => { mods.state.toggleAttending(item); reflectAttend(); });
  reflectAttend();
  bullets.append(attendBtn);

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "aiwb-fitxa__bullet-btn";
  function reflectFav() {
    const fav = isFavorite(item);
    favBtn.innerHTML = `<i class="fa-${fav ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`;
    favBtn.classList.toggle("is-active", fav);
    favBtn.setAttribute("aria-pressed", String(fav));
    favBtn.setAttribute("aria-label", fav ? "Treure de preferits" : "Afegir a preferits");
  }
  favBtn.addEventListener("click", () => { toggleFavorite(item); reflectFav(); });
  reflectFav();
  bullets.append(favBtn);

  const routeToggleBtn = document.createElement("button");
  routeToggleBtn.type = "button";
  routeToggleBtn.className = "aiwb-fitxa__bullet-btn";
  function reflectRouteToggle() {
    const inRoute = mods.state.isInRoute(item);
    routeToggleBtn.innerHTML = '<i class="fa-solid fa-route" aria-hidden="true"></i>';
    routeToggleBtn.classList.toggle("is-active", inRoute);
    routeToggleBtn.setAttribute("aria-pressed", String(inRoute));
    routeToggleBtn.setAttribute("aria-label", inRoute ? "Treure de la ruta" : "Afegir a la ruta");
  }
  routeToggleBtn.addEventListener("click", () => {
    if (mods.state.isInRoute(item)) mods.state.removeFromRoute(item);
    else mods.state.addToRoute(item);
    reflectRouteToggle();
    if (onRouteChange) onRouteChange();
  });
  reflectRouteToggle();
  bullets.append(routeToggleBtn);
  card.append(bullets);

  card.append(el("h1", "aiwb-fitxa__title", item.title));
  card.append(fitxaOrganizerBlock(item));
  card.append(fitxaDescriptionBlock(item));

  card.append(el("hr", "aiwb-fitxa__divider"));

  const actions = el("div", "aiwb-fitxa__actions");
  if (item.venue) {
    const goBtn = document.createElement("a");
    goBtn.className = "ds-button";
    goBtn.href = mods.geo.walkingDirectionsUrl(item.venue);
    goBtn.target = "_blank";
    goBtn.rel = "noopener";
    goBtn.setAttribute("data-no-router", "");
    goBtn.innerHTML = '<i class="fa-solid fa-diamond-turn-right" aria-hidden="true"></i> Com arribar';
    actions.append(goBtn);
  }
  if (item.sourceUrl) {
    const officialBtn = document.createElement("a");
    officialBtn.className = "ds-button ds-button--ghost";
    officialBtn.href = item.sourceUrl;
    officialBtn.target = "_blank";
    officialBtn.rel = "noopener";
    officialBtn.setAttribute("data-no-router", "");
    officialBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Pàgina oficial';
    actions.append(officialBtn);
  }
  card.append(actions);

  card.append(el("hr", "aiwb-fitxa__divider"));
  card.append(fitxaLocationBlock(item));
  card.append(el("hr", "aiwb-fitxa__divider"));
  card.append(fitxaRegistrationBlock(item));
  card.append(el("hr", "aiwb-fitxa__divider"));
  card.append(fitxaSourcesBlock(item));

  return card;
}

export function emptyState(message, icon = "fa-solid fa-inbox", action = null) {
  const wrap = el("div", "ds-empty");
  const i = document.createElement("i");
  i.className = `ds-empty__icon ${icon}`;
  i.setAttribute("aria-hidden", "true");
  wrap.append(i);
  wrap.append(el("p", "ds-empty__desc", message));
  if (action) {
    const link = document.createElement(action.onClick ? "button" : "a");
    link.className = "ds-button ds-button--primary ds-empty__action";
    if (action.onClick) { link.type = "button"; link.addEventListener("click", action.onClick); }
    else link.href = action.href;
    const actionIcon = document.createElement("i");
    actionIcon.className = action.icon || "fa-solid fa-arrow-right";
    actionIcon.setAttribute("aria-hidden", "true");
    link.append(actionIcon, document.createTextNode(" " + action.label));
    wrap.append(link);
  }
  return wrap;
}
