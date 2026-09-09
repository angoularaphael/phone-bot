'use strict';

/**
 * Charge phone-bot/base-de-connaissance.txt — source unique des faits pour l'IA vocale.
 * Extraire peu de texte (Groq a un quota journalier) : le modèle répond à LA question.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'base-de-connaissance.txt');

let cachedRaw = null;
let cachedParts = null;

function loadRaw() {
    if (cachedRaw != null) return cachedRaw;
    try {
        cachedRaw = fs.readFileSync(FILE, 'utf8');
    } catch (e) {
        cachedRaw = '';
    }
    return cachedRaw;
}

function splitParts() {
    if (cachedParts) return cachedParts;
    const raw = loadRaw();
    const parts = [];
    const re = /\n={10,}\s*\n([^\n]+)\n={10,}\s*\n/g;
    const headers = [];
    let m;
    while ((m = re.exec(raw))) {
        headers.push({ title: m[1].trim(), start: m.index + m[0].length, headerAt: m.index });
    }
    const preamble = raw.slice(0, headers[0] ? headers[0].headerAt : raw.length).trim();
    if (preamble) parts.push({ id: 'preamble', title: 'preamble', body: preamble.slice(0, 400) });
    for (let i = 0; i < headers.length; i += 1) {
        const end = headers[i + 1] ? headers[i + 1].headerAt : raw.length;
        const title = headers[i].title;
        const body = raw.slice(headers[i].start, end).trim();
        const num = (title.match(/^(\d+\s*(?:BIS)?)/i) || [])[1] || '';
        parts.push({ id: String(num).replace(/\s+/g, '').toLowerCase() || `s${i}`, title, body });
    }
    cachedParts = parts;
    return parts;
}

function partByNum(parts, num) {
    const n = String(num).toLowerCase().replace(/\s+/g, '');
    return parts.find((p) => {
        const head = p.title.toLowerCase().replace(/\s+/g, '');
        return head.startsWith(`${n}.`);
    });
}

function sliceHeading(body, startRe, endRe) {
    const src = String(body || '');
    const start = src.search(startRe);
    if (start < 0) return '';
    const rest = src.slice(start);
    const end = endRe ? rest.search(endRe) : -1;
    return (end > 0 ? rest.slice(0, end) : rest).trim();
}

function wantsKids(text) {
    return /enfant|fils|fille|gamin|ado|mineur|baby|bébé|[ée]ducative|\b\d+\s*ans?\b/i.test(text || '');
}

function agesIn(text) {
    return [...String(text || '').matchAll(/(\d+)\s*ans?/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 20);
}

function babyPlanningLines(raw) {
    return String(raw || '')
        .split('\n')
        .filter((l) => /baby boxe|éducative 7|éducative 12|dès 3 ans|educative 7|educative 12/i.test(l))
        .slice(0, 40)
        .join('\n');
}

function selectKnowledge(userText) {
    const parts = splitParts();
    const t = String(userText || '');
    const ids = new Set(['1', '3', '9']);
    const extra = [];

    if (wantsKids(t)) {
        const disc = partByNum(parts, '2');
        extra.push(sliceHeading(disc && disc.body, /2\.4\.|Baby Boxe/i, /\n2\.5\./));
        const faq = partByNum(parts, '15');
        extra.push(sliceHeading(faq && faq.body, /À partir de quel âge|age les enfants/i, /\nQ :/));
        extra.push(babyPlanningLines(loadRaw()));
        ids.add('11');
    }
    if (/minimes|barriere|fenouillet/i.test(t)) ids.add('5');
    if (/ramonville/i.test(t)) ids.add('6');
    if (/cyprien|reynerie|mirail|bellefontaine|bagatelle|fer\s+[àa]\s+cheval/i.test(t)) ids.add('7');
    if (/portet/i.test(t)) ids.add('8BIS');
    if (/[ée]tats[-\s]?unis|lalande/i.test(t)) ids.add('8');
    if (/coach|mehdi|dadi|valentin|mourad|renaud/i.test(t)) ids.add('4');
    if (/essai|essayer|d[ée]couvrir/i.test(t)) ids.add('10');
    if (/inscri|abonn|dossier|papier/i.test(t) && !wantsKids(t)) ids.add('11');
    if (/r[ée]sili|arr[eê]ter|pr[ée]l[èe]vement|facture/i.test(t)) ids.add('12');
    if (/m[ée]dical|certificat|sant[ée]|blessure/i.test(t)) ids.add('13');
    if (/faq|débutant|debutant|femme|clim|douche/i.test(t)) ids.add('15');

    const chosen = [];
    for (const id of ids) {
        const p = partByNum(parts, id);
        if (!p || !p.body) continue;
        const body = (id === '1' || id === '3' || id === '9') ? p.body.slice(0, 1800) : p.body;
        chosen.push(`## ${p.title}\n${body}`);
    }
    for (const block of extra) {
        if (block) chosen.push(block);
    }
    return chosen.join('\n\n');
}

function buildFileKnowledge(userText) {
    const facts = selectKnowledge(userText);
    if (!facts) return '';
    return (
        `# BASE DE CONNAISSANCES BOXING CENTER (source unique des faits)\n` +
        `Réponds à LA question avec ces faits. N'invente rien. Pas de script tout fait.\n` +
        `Moins de 3 ans : trop jeune, Baby Boxe à partir de 3 ans. 3 à 6 ans : Baby Boxe, pas la boxe anglaise adulte. 7-11 : éducative. 12-16 : éducative ados.\n` +
        `Reynerie / Mirail / Bellefontaine = Saint-Cyprien.\n\n` +
        facts
    );
}

/**
 * Si Groq et Gemini sont down : répondre quand même avec les faits du fichier.
 */
function fallbackFromKnowledge(text) {
    const ages = agesIn(text);
    if (!wantsKids(text) && !ages.length) return '';
    const tooYoung = ages.filter((a) => a < 3);
    const baby = ages.filter((a) => a >= 3 && a <= 6);
    const edu = ages.filter((a) => a >= 7 && a <= 11);
    const ado = ages.filter((a) => a >= 12 && a <= 16);
    const parts = [];
    if (tooYoung.length) {
        parts.push(
            `La Baby Boxe commence à 3 ans. Un enfant de ${tooYoung.join(' et ')} ans est trop jeune pour s'inscrire.`
        );
    }
    if (baby.length || (!ages.length && wantsKids(text) && !tooYoung.length && !edu.length && !ado.length)) {
        const who = baby.length ? `À ${baby.join(' et ')} ans` : 'Pour un jeune enfant';
        parts.push(
            `${who}, ce n'est pas la boxe anglaise adulte : c'est la Baby Boxe, dès 3 ans. C'est ludique, samedi après-midi selon la salle. L'inscription se fait en ligne.`
        );
    }
    if (edu.length) {
        parts.push(
            `De 7 à 11 ans, c'est la boxe éducative, mercredi et samedi. L'inscription se fait en ligne.`
        );
    }
    if (ado.length) {
        parts.push(
            `De 12 à 16 ans, c'est la boxe éducative 12-16 ans, mercredi et samedi.`
        );
    }
    parts.push('Quelle salle vous arrange ? Minimes, Portet, Ramonville, Saint-Cyprien ou États-Unis ?');
    return parts.join(' ');
}

module.exports = { loadRaw, selectKnowledge, buildFileKnowledge, wantsKids, fallbackFromKnowledge, agesIn };
