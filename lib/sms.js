'use strict';

/**
 * Envoi de SMS via Twilio.
 *
 * 1. Texte  → TEXTS dans buildSmsBody()
 * 2. Liens  → LINK_* dans .env / config/routing.js
 */

const twilio = require('twilio');
const { log, warn } = require('./logger');

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

/**
 * Construit le corps du SMS selon le motif d'appel.
 * @param {string} motif   Identifiant du motif (ex: 'seance_essai')
 * @param {string} name    Prénom de l'appelant (ou null)
 * @param {string} link    Lien URL à inclure
 */
function buildSmsBody(motif, name, link) {
    const greet = name ? `Bonjour ${name},\n` : '';

    const ALIASES = {
        horaires:     'infos_pratiques',
        planning:     'infos_pratiques',
        tarifs:       'inscription',
        seance_essai: 'inscription',
    };
    const key = ALIASES[motif] || motif;

    const TEXTS = {
        infos_pratiques:
            `Boxing Center — Horaires :\n` +
            `Lundi au samedi : 10h–21h30. Dimanche : fermé.\n` +
            `5 salles : Minimes, Portet, Ramonville, Saint-Cyprien, États-Unis.`,

        inscription:
            `Boxing Center — Offres :\n` +
            `29 € toutes les 4 semaines (sans engagement, tous les 28 jours).\n` +
            `259 € pour 12 mois (le plus avantageux sur l'année).\n` +
            `Séance d'essai : 10 €. Inscription sur la boutique.`,

        planning:
            `Boxing Center — Planning rentrée 2026-2027.\n` +
            `Dites-nous votre salle pour les créneaux précis, ou consultez le site.`,

        competition:
            `Boxing Center — Pôle compétition.\n` +
            `Les cours « compétiteurs » sont réservés aux confirmés. Pour découvrir : cours loisirs tous niveaux.`,

        administratif:
            `Boxing Center — Résiliation :\n` +
            `Uniquement en ligne : Gérer mon abonnement → Résilier mon abonnement.\n` +
            `Plus de 72 h avant le prochain prélèvement. Une demande orale ne suffit pas.`,
    };

    const base = TEXTS[key] || `Boxing Center — Merci pour votre appel. Nous restons à votre disposition.`;
    const extraLinks = [];
    if (key === 'infos_pratiques' && process.env.LINK_PLANNING) {
        extraLinks.push(process.env.LINK_PLANNING);
    }
    if (key === 'inscription') {
        if (process.env.LINK_TARIFS)      extraLinks.push(process.env.LINK_TARIFS);
        if (process.env.LINK_INSCRIPTION) extraLinks.push(process.env.LINK_INSCRIPTION);
        if (process.env.LINK_ESSAI)       extraLinks.push(process.env.LINK_ESSAI);
    }
    if (key === 'administratif' && process.env.LINK_GERER_ABO) {
        extraLinks.push(process.env.LINK_GERER_ABO);
    }
    const linkPart = [link, ...extraLinks.filter(l => l && l !== link)]
        .map(l => `\n${l}`)
        .join('');
    return `${greet}${base}${linkPart}`;
}

module.exports = { sendSms, buildSmsBody, isConfigured };
