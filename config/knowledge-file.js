'use strict';

/**
 * Charge phone-bot/base-de-connaissance.txt — source unique des faits pour l'IA vocale.
 * On n'invente pas de scripts : le modèle répond à partir de ce fichier.
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
    if (preamble) parts.push({ id: 'preamble', title: 'preamble', body: preamble });
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

function wantsKids(text) {
    return /enfant|fils|fille|gamin|ado|mineur|baby|bébé|[ée]ducative|\b\d+\s*ans?\b/i.test(text || '');
}

function selectKnowledge(userText) {
    const parts = splitParts();
    const t = String(userText || '');
    const ids = new Set(['1', '2', '3', '9', '15', '17']);

    if (wantsKids(t)) {
        ['5', '6', '7', '8', '8BIS', '8bis'].forEach((id) => ids.add(id));
    }
    if (/minimes|barriere|fenouillet/i.test(t)) ids.add('5');
    if (/ramonville/i.test(t)) ids.add('6');
    if (/cyprien|reynerie|mirail|bellefontaine|bagatelle|fer\s+[àa]\s+cheval/i.test(t)) ids.add('7');
    if (/portet/i.test(t)) ids.add('8BIS');
    if (/[ée]tats[-\s]?unis|lalande/i.test(t)) ids.add('8');
    if (/planning|horaire|creneau|cours|quand|mercredi|samedi/i.test(t) && ![...ids].some((x) => /^(5|6|7|8)/.test(x))) {
        ['5', '6', '7', '8', '8BIS'].forEach((id) => ids.add(id));
    }
    if (/coach|mehdi|dadi|valentin|mourad|renaud/i.test(t)) ids.add('4');
    if (/essai|essayer|d[ée]couvrir/i.test(t)) ids.add('10');
    if (/inscri|abonn|dossier|papier/i.test(t)) ids.add('11');
    if (/r[ée]sili|arr[eê]ter|pr[ée]l[èe]vement|facture/i.test(t)) ids.add('12');
    if (/m[ée]dical|certificat|sant[ée]|blessure/i.test(t)) ids.add('13');
    if (/r[èe]glement|vestiaire|douche|tenue/i.test(t)) ids.add('14');

    const chosen = [];
    const preamble = parts.find((p) => p.id === 'preamble');
    if (preamble) chosen.push(preamble.body);
    for (const id of ids) {
        const p = partByNum(parts, id);
        if (p && p.body) chosen.push(`## ${p.title}\n${p.body}`);
    }
    if (chosen.length < 2) return loadRaw();
    return chosen.join('\n\n');
}

function buildFileKnowledge(userText) {
    const facts = selectKnowledge(userText);
    if (!facts) return '';
    return (
        `# BASE DE CONNAISSANCES BOXING CENTER (source unique des faits)\n` +
        `Tu réponds à partir de ce document, comme un conseiller qui l'a lu. ` +
        `Tu n'inventes rien. Tu ne récites pas un script tout fait : tu réponds à LA question posée.\n` +
        `Enfant 3 à 6 ans = Baby Boxe dès 3 ans. 7 à 11 ans = boxe éducative 7-11. 12 à 16 ans = boxe éducative 12-16.\n` +
        `Quartier Reynerie / Mirail / Bellefontaine / Bagatelle = salle Saint-Cyprien.\n\n` +
        facts
    );
}

module.exports = { loadRaw, selectKnowledge, buildFileKnowledge, wantsKids };
