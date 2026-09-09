'use strict';

/**
 * Calendrier Europe/Paris — « demain », « ce soir », jour de semaine.
 */

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function parisYmd(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function weekdayFrParis(now = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' })
    .format(now)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function addDaysParis(n, now = new Date()) {
  const [y, m, d] = parisYmd(now).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12, 0, 0));
}

function formatTodayFr(now = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

function foldDay(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * @returns {{ day: string, slot: 'soir'|'matin'|'midi'|null, label: string } | null}
 */
function resolveAskedDay(text, now = new Date()) {
  const t = foldDay(text);
  const named = /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/.exec(t);
  if (/\bdemain\b/.test(t)) {
    const day = weekdayFrParis(addDaysParis(1, now));
    return { day, slot: /\bsoir\b/.test(t) ? 'soir' : null, label: 'demain' };
  }
  if (/apres[\s-]?demain/.test(t)) {
    return { day: weekdayFrParis(addDaysParis(2, now)), slot: null, label: 'après-demain' };
  }
  if (/\baujourd|ce soir|cet?\s+apres|ce matin|ce midi/.test(t) && !named) {
    const slot = /\bce soir\b/.test(t) ? 'soir' : /\bce matin\b/.test(t) ? 'matin' : /\bce midi\b/.test(t) ? 'midi' : null;
    return { day: weekdayFrParis(now), slot, label: 'aujourd\'hui' };
  }
  if (named) {
    return { day: named[1], slot: /\bsoir\b/.test(t) ? 'soir' : null, label: named[1] };
  }
  return null;
}

function startMinutes(line) {
  const m = /(\d{1,2})\s*[hH](\d{2})/.exec(String(line || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
}

function filterToDay(src, dayFr) {
  const want = foldDay(dayFr);
  const lines = String(src || '').split('\n');
  const out = [];
  let keep = false;
  let sawDays = false;
  for (const line of lines) {
    const t = foldDay(line.trim());
    const header = DAYS.find((d) => t === d || t.startsWith(`${d} `) || t.startsWith(`${d}\t`));
    if (header) {
      sawDays = true;
      keep = header === want;
      if (keep) out.push(line);
      continue;
    }
    if (!sawDays) out.push(line);
    else if (keep) out.push(line);
  }
  return sawDays ? out.join('\n') : String(src || '');
}

function filterToSlot(src, slot) {
  if (!slot) return src;
  const lo = slot === 'matin' ? 0 : slot === 'midi' ? 11 * 60 : 17 * 60;
  const hi = slot === 'matin' ? 12 * 60 : slot === 'midi' ? 15 * 60 : 24 * 60;
  return String(src || '')
    .split('\n')
    .filter((line) => {
      if (!/\d{1,2}\s*[hH]\d{2}/.test(line)) return true;
      const m = startMinutes(line);
      return m < 0 || (m >= lo && m < hi);
    })
    .join('\n');
}

function clockBlock(userText, now = new Date()) {
  const today = weekdayFrParis(now);
  const tomorrow = weekdayFrParis(addDaysParis(1, now));
  const asked = resolveAskedDay(userText, now);
  const askedLine = asked
    ? `La question porte sur ${asked.label} = ${asked.day}${asked.slot ? ` (${asked.slot})` : ''}. Tu ne donnes QUE ce jour-là, pas le reste de la semaine.`
    : `Aucun jour précis : demande le jour, ou donne seulement ce soir si on parle d'un entraînement ce soir. Ne récite JAMAIS toute la semaine.`;
  return `
# DATE DU JOUR (Europe/Paris)
Aujourd'hui : ${formatTodayFr(now)} (${today}).
Demain = ${tomorrow}.
${askedLine}
Dimanche : pas de créneaux de cours publiés (lundi au samedi).
`.trim();
}

module.exports = {
  DAYS,
  weekdayFrParis,
  addDaysParis,
  formatTodayFr,
  resolveAskedDay,
  filterToDay,
  filterToSlot,
  clockBlock,
};
