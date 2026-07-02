'use strict';

/**
 * Envoi de SMS via l'API Telnyx Messaging.
 */

const telnyx = require('./telnyx');
const { log, warn } = require('./logger');

const DRY_RUN = () => process.env.BOT_DRY_RUN === 'true';

function isConfigured() {
    return telnyx.isConfigured();
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

    if (!isConfigured()) {
        warn('Telnyx non configuré — SMS non envoyé');
        return { ok: false, error: 'not_configured' };
    }

    try {
        const result = await telnyx.sendSms({ to, text: body });
        const id = result?.data?.id || 'sent';
        log(`📱 SMS envoyé → ${to} [${id}]`);
        return { ok: true, sid: id };
    } catch (e) {
        warn(`Erreur SMS: ${e.message}`);
        return { ok: false, error: e.message };
    }
}

/**
 * WhatsApp non supporté via Telnyx sur ce bot — fallback SMS.
 */
async function sendWhatsApp({ to, body }) {
    warn('WhatsApp non disponible — utilisez SMS (touche 1)');
    return sendSms({ to, body });
}

/**
 * Construit le corps du SMS selon le motif d'appel.
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
