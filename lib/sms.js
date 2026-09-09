'use strict';

/**
 * Envoi de SMS via Twilio.
 *
 * 1. Texte  → TEXTS dans buildSmsBody()
 * 2. Liens  → LINK_* dans .env / config/routing.js
 */

const twilio = require('twilio');
const { log, warn } = require('./logger');
const { GYMS } = require('../config/kb');

const DRY_RUN = () => process.env.BOT_DRY_RUN === 'true';

let _client = null;

function getClient() {
    if (_client) return _client;
    const sid  = process.env.TWILIO_ACCOUNT_SID;
    const auth = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !auth) return null;
    _client = twilio(sid, auth);
    return _client;
}

function isConfigured() {
    return !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN  &&
        process.env.TWILIO_PHONE_NUMBER
    );
}

function capitalizeName(name) {
    return String(name || '')
        .trim()
        .replace(/[.,!?]/g, '')
        .split(/[-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('-');
}

const NAME_SKIP = /^(le|la|les|un|une|mon|ma|mes|oui|non|ok|bonjour|salut|alors|euh|ben|cest|je|suis|voila|voilà)$/i;

function extractFirstName(speech) {
    const s = String(speech || '').replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    const intro = s.match(
        /(?:je m['’]?appelle|je suis|c['’]?\s*est|moi c['’]?\s*est|prenom(?: c['’]?\s*est)?|prénom(?: c['’]?\s*est)?)\s+([A-Za-zÀ-ÿ'’-]+)/i
    );
    if (intro) return capitalizeName(intro[1]);
    const words = s.split(' ').filter((w) => w && !NAME_SKIP.test(w) && !/^\d+$/.test(w) && !/^m['’]appelle$/i.test(w));
    const first = words[0] || '';
    if (first.length < 2 || first.length > 18) return '';
    return capitalizeName(first);
}

/**
 * Envoie un SMS.
 * @returns {{ ok: boolean, sid?: string, error?: string }}
 */
async function sendSms({ to, body }) {
    if (DRY_RUN()) {
        log(`📱 [DRY-RUN] SMS → ${to} : "${body.slice(0, 60)}..."`);
        return { ok: true, sid: 'dry-run' };
    }

    const client = getClient();
    if (!client) {
        warn('Twilio non configuré — SMS non envoyé');
        return { ok: false, error: 'not_configured' };
    }

    try {
        const msg = await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to,
            body,
        });
        log(`📱 SMS envoyé → ${to} [${msg.sid}]`);
        return { ok: true, sid: msg.sid };
    } catch (e) {
        warn(`Erreur SMS: ${e.message}`);
        return { ok: false, error: e.message };
    }
}

const KIDS_EDU = {
    minimes:
        `Boxe éducative à Minimes : mercredi et samedi, 15h–16h (7-11 ans) et 16h–17h (12-16 ans), avec Mehdi.`,
    ramonville:
        `Boxe éducative à Ramonville : mercredi et samedi, 15h–16h (7-11 ans) et 16h–17h (12-16 ans), avec Valentin Guth.`,
    'st-cyprien':
        `Boxe éducative à Saint-Cyprien : mercredi et samedi, 15h–16h (7-11 ans) et 16h–17h (12-16 ans), avec Dadi.`,
    portet:
        `Boxe éducative à Portet : mercredi et samedi, 16h–17h (7-11 ans) et 17h–18h (12-16 ans), avec Mourad.`,
    'etats-unis':
        `Cours enfants aux États-Unis (pieds-poings) : mercredi et samedi, 15h–16h (7-11 ans) et 16h–17h (12-16 ans), avec Renaud.`,
};

/**
 * Construit le corps du SMS selon le motif d'appel.
 * @param {string} motif   Identifiant du motif (ex: 'seance_essai')
 * @param {string} name    Prénom de l'appelant (ou null)
 * @param {string} link    Lien URL à inclure
 * @param {{ gym?: string, lastQuestion?: string, messages?: Array }} extra
 */
function buildSmsBody(motif, name, link, extra = {}) {
    const prenom = capitalizeName(name);
    const greet = prenom ? `Bonjour ${prenom},\n\n` : 'Bonjour,\n\n';
    const blob = `${extra.lastQuestion || ''} ${(extra.messages || []).map((m) => m.content || '').join(' ')}`;
    const kids = /enfant|éducative|educative|ado|mineur|fils|fille/i.test(blob);
    const gym = extra.gym && GYMS[extra.gym] ? extra.gym : null;
    const gymLabel = gym ? GYMS[gym].fullLabel : '';

    let intro = '';
    if (prenom && kids && gym && KIDS_EDU[gym]) {
        intro =
            `Comme convenu lors de votre appel, voici les informations pour inscrire votre enfant à ${gymLabel}.\n\n` +
            `${KIDS_EDU[gym]}\n\n`;
    } else if (prenom && kids) {
        intro = `Comme convenu lors de votre appel, voici les informations pour inscrire votre enfant chez Boxing Center.\n\n`;
    } else if (prenom && gymLabel) {
        intro = `Comme convenu lors de votre appel, voici les informations pour ${gymLabel}.\n\n`;
    } else if (prenom) {
        intro = `Comme convenu lors de votre appel, voici les informations Boxing Center.\n\n`;
    }

    const ALIASES = {
        horaires:     'infos_pratiques',
        planning:     'infos_pratiques',
        tarifs:       'inscription',
        seance_essai: 'inscription',
    };
    const key = ALIASES[motif] || motif;

    const TEXTS = {
        infos_pratiques:
            `Horaires : lundi au samedi, 10h–21h30. Dimanche : fermé.\n` +
            `5 salles : Minimes, Portet, Ramonville, Saint-Cyprien, États-Unis.`,

        inscription:
            `Offres :\n` +
            `29 € toutes les 4 semaines (sans engagement, tous les 28 jours).\n` +
            `259 € pour 12 mois (le plus avantageux sur l'année).\n` +
            `Séance d'essai : 10 €. Inscription sur la boutique.`,

        planning:
            `Planning rentrée 2026-2027.\n` +
            `Retrouvez les créneaux de votre salle sur le site.`,

        competition:
            `Pôle compétition.\n` +
            `Les cours « compétiteurs » sont réservés aux confirmés. Pour découvrir : cours loisirs tous niveaux.`,

        administratif:
            `Résiliation :\n` +
            `Uniquement en ligne : Gérer mon abonnement → Résilier mon abonnement.\n` +
            `Plus de 72 h avant le prochain prélèvement. Une demande orale ne suffit pas.`,
    };

    const base = TEXTS[key] || `Merci pour votre appel. Nous restons à votre disposition.`;
    const extraLinks = [];
    if (key === 'infos_pratiques' && process.env.LINK_PLANNING) {
        extraLinks.push(process.env.LINK_PLANNING);
    }
    if (key === 'inscription' || kids) {
        if (process.env.LINK_TARIFS)      extraLinks.push(process.env.LINK_TARIFS);
        if (process.env.LINK_INSCRIPTION) extraLinks.push(process.env.LINK_INSCRIPTION);
        if (process.env.LINK_ESSAI)       extraLinks.push(process.env.LINK_ESSAI);
    }
    if (key === 'administratif' && process.env.LINK_GERER_ABO) {
        extraLinks.push(process.env.LINK_GERER_ABO);
    }
    const linkPart = [link, ...extraLinks.filter((l) => l && l !== link)]
        .map((l) => `\n${l}`)
        .join('');
    return `${greet}${intro}${base}${linkPart}`;
}

module.exports = { sendSms, buildSmsBody, isConfigured, extractFirstName, capitalizeName };
