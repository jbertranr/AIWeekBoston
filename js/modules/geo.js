/* ============================================================
   modules/geo.js
   Geolocalització sota demanda (mai en segon pla), distància en
   línia recta (no de carrer) i enllaç "Com arribar" a peu.
   ============================================================ */

/**
 * Demana la ubicació NOMÉS quan es crida (mai a l'arrencada).
 * @returns {Promise<{lat:number,lng:number,accuracyM:number}>}
 */
export function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ code: "unsupported", messageCa: "Aquest dispositiu o navegador no ofereix geolocalització." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy
        });
      },
      (err) => {
        const map = {
          1: { code: "denied", messageCa: "Has denegat el permís d'ubicació." },
          2: { code: "unavailable", messageCa: "La ubicació no està disponible ara mateix." },
          3: { code: "timeout", messageCa: "S'ha exhaurit el temps d'espera per obtenir la ubicació." }
        };
        reject(map[err.code] || { code: "unknown", messageCa: "No s'ha pogut obtenir la ubicació." });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

/**
 * Seguiment en viu de la ubicació — NOMÉS mentre l'usuari l'ha activat
 * explícitament a la pantalla "Mapa" (mai a l'arrencada, mai en segon
 * pla): cada canvi de posició del dispositiu crida onUpdate. Qui crida
 * aquesta funció és responsable de parar-la amb stopWatchingLocation()
 * en sortir de la pantalla — vegeu js/mapa.js.
 * @returns {number|null} watchId (per aturar-lo), o null si no hi ha suport.
 */
export function watchLocation(onUpdate, onError) {
  if (!("geolocation" in navigator)) {
    onError({ code: "unsupported", messageCa: "Aquest dispositiu o navegador no ofereix geolocalització." });
    return null;
  }
  return navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy
      });
    },
    (err) => {
      const map = {
        1: { code: "denied", messageCa: "Has denegat el permís d'ubicació." },
        2: { code: "unavailable", messageCa: "La ubicació no està disponible ara mateix." },
        3: { code: "timeout", messageCa: "S'ha exhaurit el temps d'espera per obtenir la ubicació." }
      };
      onError(map[err.code] || { code: "unknown", messageCa: "No s'ha pogut obtenir la ubicació." });
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
}

/** Atura un seguiment en viu iniciat amb watchLocation(). Segur de cridar
    amb null/undefined (no fa res). */
export function stopWatchingLocation(watchId) {
  if (watchId != null && "geolocation" in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Orientació del dispositiu (cap a on apunta, com el con blau de Google
 * Maps) — NOMÉS mentre dura el seguiment en viu de la ubicació, mai per
 * separat. Crida onHeading(graus) cada vegada que canvia, en graus des
 * del nord en sentit horari (0 = nord, 90 = est…). Si el navegador només
 * dona una orientació RELATIVA (sense referència real al nord — molt
 * habitual en Android sense magnetòmetre calibrat), no es crida mai
 * onHeading: ensenyar una fletxa que no apunta enlloc de veritat seria
 * pitjor que no ensenyar-ne cap.
 *
 * A iOS 13+ cal permís explícit de l'usuari (DeviceOrientationEvent.
 * requestPermission()), que només es pot demanar dins d'un gest real
 * (el mateix clic que activa el seguiment) — per això aquesta funció
 * retorna una Promise en lloc d'un valor síncron.
 *
 * @returns {Promise<Function|null>} funció per aturar l'escolta, o null
 *   si no hi ha suport/permís.
 */
export function watchHeading(onHeading) {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") {
    return Promise.resolve(null);
  }

  const attach = () => {
    const eventName = "ondeviceorientationabsolute" in window
      ? "deviceorientationabsolute"
      : "deviceorientation";
    const handler = (e) => {
      // iOS: webkitCompassHeading ja és absolut (graus des del nord, sentit
      // horari). Altres navegadors: només si el propi event es marca
      // "absolute" ens podem refiar d'alpha — si no, és relatiu a
      // l'orientació que tenia el dispositiu en carregar la pàgina, no al
      // nord real.
      let heading = null;
      if (typeof e.webkitCompassHeading === "number") {
        heading = e.webkitCompassHeading;
      } else if (e.absolute === true && typeof e.alpha === "number") {
        // `360 - alpha` sol donar el rumb de la brúixola, però en
        // `deviceorientationabsolute` real (Android) surt sistemàticament
        // girat 180° respecte al que apunta de veritat el mòbil — bug
        // confirmat provant-ho en un dispositiu real (13/09/2026). No és
        // un cas aïllat: és un desajust conegut entre com defineix l'alpha
        // "absolut" cada navegador. Es corregeix sumant els 180° que
        // faltaven.
        heading = (360 - e.alpha + 180) % 360;
      }
      if (heading != null) onHeading(heading);
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  };

  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    return DeviceOrientationEvent.requestPermission()
      .then((state) => (state === "granted" ? attach() : null))
      .catch(() => null);
  }
  return Promise.resolve(attach());
}

/** Distància en línia recta (Haversine), en km — MAI metres reals de carrer. */
export function straightLineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return "distància desconeguda";
  if (km < 1) return `≈ ${Math.round(km * 1000)} m en línia recta`;
  return `≈ ${km.toFixed(1)} km en línia recta`;
}

/** URL de Google Maps en mode a peu — no cal clau d'API. Totes les seus
    del catàleg són a l'àrea de Boston, MA, per això s'afegeix com a
    referència quan cal cercar per adreça (sense coordenades). */
export function walkingDirectionsUrl(venue) {
  const dest = venue.coordinates
    ? `${venue.coordinates.lat},${venue.coordinates.lng}`
    : encodeURIComponent(`${venue.address || venue.name}, Boston, MA`);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
}
