'use strict';

/**
 * Envoi de SMS et messages WhatsApp via l'API Twilio.
 * Le même client Twilio est réutilisé (singleton).
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
 * Envoie un message WhatsApp via Twilio.
 * Nécessite le Sandbox WhatsApp Twilio ou un numéro WhatsApp Business approuvé.
 */
async function sendWhatsApp({ to, body }) {
    if (DRY_RUN()) {
        log(`💬 [DRY-RUN] WhatsApp → ${to} : "${body.slice(0, 60)}..."`);
        return { ok: true, sid: 'dry-run' };
    }

    const client    = getClient();
    const fromRaw   = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';
    const fromNum   = fromRaw.replace('whatsapp:', '');
    const toNum     = to.replace('whatsapp:', '');

    if (!client) {
        warn('Twilio non configuré — WhatsApp non envoyé');
        return { ok: false, error: 'not_configured' };
    }

    try {
        const msg = await client.messages.create({
            from: `whatsapp:${fromNum}`,
            to:   `whatsapp:${toNum}`,
            body,
        });
        log(`💬 WhatsApp envoyé → ${to} [${msg.sid}]`);
        return { ok: true, sid: msg.sid };
    } catch (e) {
        warn(`Erreur WhatsApp: ${e.message}`);
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

    const TEXTS = {
        horaires:
            `Boxing Center — Horaires d'ouverture :\n` +
            `Lu-Ve : 9h00 → 21h30\n` +
            `Samedi : 9h00 → 18h00\n` +
            `Dimanche : 9h00 → 13h00`,

        tarifs:
            `Boxing Center — Nos tarifs :\n` +
            `Adulte : dès 45 €/mois\n` +
            `Enfant / Étudiant : tarifs réduits\n` +
            `Offre Été & Rentrée disponibles`,

        seance_essai:
            `Boxing Center — Votre séance d'essai GRATUITE vous attend !\n` +
            `Sans engagement — réservez votre créneau dès maintenant.`,

        inscription:
            `Boxing Center — Pour vous inscrire :\n` +
            `Présentez-vous à l'accueil avec une pièce d'identité et un justificatif de domicile.\n` +
            `Horaires d'accueil : Lu-Sa`,

        planning:
            `Boxing Center — Planning des cours (30+ créneaux/semaine) :\n` +
            `Boxe anglaise, kick-boxing, savate, fitness combat, cours enfants & adultes.`,

        competition:
            `Boxing Center — Équipe compétition :\n` +
            `Galeas régionaux & nationaux. Intégration après 3 mois de cours réguliers.`,

        administratif:
            `Boxing Center — Service administratif :\n` +
            `Disponible Lu-Ve de 9h à 17h.\n` +
            `Espace membre en ligne pour vos documents et factures.`,

        acces_salle:
            `Boxing Center — Accès à la salle :`,
    };

    const base = TEXTS[motif] || `Boxing Center — Merci pour votre appel. Nous restons à votre disposition.`;
    const linkPart = link ? `\n\n${link}` : '';
    return `${greet}${base}${linkPart}`;
}

module.exports = { sendSms, sendWhatsApp, buildSmsBody, isConfigured };
