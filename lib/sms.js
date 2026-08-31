'use strict';

/**
 * Envoi de SMS et messages WhatsApp via l'API Twilio.
 *
 * ── Personnaliser les SMS / WhatsApp ─────────────────────────────
 * 1. Texte du message  → objet TEXTS dans buildSmsBody() ci-dessous
 *    (une entrée par motif : infos_pratiques, inscription, etc.)
 * 2. Liens URL ajoutés → variables LINK_* dans .env
 *    (voir config/routing.js pour le lien principal par motif)
 * 3. SMS et WhatsApp utilisent le même texte (buildSmsBody).
 * ─────────────────────────────────────────────────────────────────
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
 * Envoie un message WhatsApp.
 *
 * Deux providers :
 *   - 'baileys' (défaut si WHATSAPP_BOT_URL défini) → bot Baileys existant
 *     (boxing-center-bot sur Bothosting, même API que gestion-manager)
 *   - 'twilio' → Sandbox / numéro WhatsApp Business Twilio
 */
async function sendWhatsApp({ to, body }) {
    if (DRY_RUN()) {
        log(`📱 [DRY-RUN] SMS (ex-WhatsApp) → ${to} : "${body.slice(0, 60)}..."`);
        return { ok: true, sid: 'dry-run' };
    }
    return sendSmsViaGateway({ to, body });
}

async function sendSmsViaGateway({ to, body }) {
    const baseUrl = (process.env.SMS_GATEWAY_URL || 'http://prem-eu2.bot-hosting.net:21724').trim().replace(/\/$/, '');
    const secret = process.env.SMS_GATEWAY_SECRET || process.env.OUTBOUND_API_SECRET || '';
    const phone = String(to || '').replace('whatsapp:', '').replace(/[^\d+]/g, '');
    const telephone = phone.startsWith('+') ? phone : `+${phone.replace(/^0/, '33')}`;
    try {
        const resp = await fetch(`${baseUrl}/api/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(secret ? { 'x-api-secret': secret } : {}),
            },
            body: JSON.stringify({ telephone, message: body, source: 'phone-bot' }),
            signal: AbortSignal.timeout(15000),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || data.error) {
            warn(`Erreur SMS gateway: ${data.error || `HTTP ${resp.status}`}`);
            return { ok: false, error: data.error || `http_${resp.status}` };
        }
        log(`📱 SMS envoyé via gateway → ${telephone}`);
        return { ok: true, sid: data.recipientId || 'sms' };
    } catch (e) {
        warn(`Erreur SMS gateway: ${e.message}`);
        return { ok: false, error: e.message };
    }
}

/**
 * Envoi via le bot Baileys (boxing-center-bot).
 * POST {WHATSAPP_BOT_URL}/api/send-message  avec x-api-secret.
 * Le bot attend le numéro au format international sans '+' (ex: 33746202368).
 */
async function sendWhatsAppViaBot({ to, body }) {
    const baseUrl = (process.env.WHATSAPP_BOT_URL || '').trim().replace(/\/$/, '');
    const secret  = process.env.SITE_API_SECRET || '';

    if (!baseUrl) {
        warn('WHATSAPP_BOT_URL non défini — WhatsApp non envoyé');
        return { ok: false, error: 'bot_url_not_configured' };
    }

    const phone = to.replace('whatsapp:', '').replace(/[^\d]/g, '');

    try {
        const resp = await fetch(`${baseUrl}/api/send-message`, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(secret ? { 'x-api-secret': secret } : {}),
            },
            body: JSON.stringify({ phone, message: body }),
            signal: AbortSignal.timeout(15000),
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || data.error) {
            warn(`Erreur WhatsApp (bot Baileys): ${data.error || `HTTP ${resp.status}`}`);
            return { ok: false, error: data.error || `http_${resp.status}` };
        }

        log(`💬 WhatsApp envoyé via bot Baileys → ${phone}`);
        return { ok: true, sid: data.id || 'baileys' };
    } catch (e) {
        warn(`Erreur WhatsApp (bot Baileys): ${e.message}`);
        return { ok: false, error: e.message };
    }
}

/**
 * Envoi via Twilio (Sandbox ou numéro WhatsApp Business approuvé).
 */
async function sendWhatsAppViaTwilio({ to, body }) {
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

    const ALIASES = {
        horaires:     'infos_pratiques',
        planning:     'infos_pratiques',
        tarifs:       'inscription',
        seance_essai: 'inscription',
    };
    const key = ALIASES[motif] || motif;

    const TEXTS = {
        infos_pratiques:
            `Boxing Center — Horaires & planning :\n` +
            `Lu-Ve : 9h-21h30 | Sam : 9h-18h | Dim : 9h-13h\n` +
            `30+ cours/semaine (boxe, kick, savate, fitness)`,

        inscription:
            `Boxing Center — Tarifs, essai & inscription :\n` +
            `Adulte dès 45 €/mois | Essai GRATUIT sans engagement\n` +
            `Inscription accueil ou en ligne`,

        competition:
            `Boxing Center — Équipe compétition :\n` +
            `Galeas régionaux & nationaux. Intégration après 3 mois de cours réguliers.`,

        administratif:
            `Boxing Center — Service administratif :\n` +
            `Disponible Lu-Ve de 9h à 17h.\n` +
            `Espace membre en ligne pour vos documents et factures.`,
    };

    const base = TEXTS[key] || `Boxing Center — Merci pour votre appel. Nous restons à votre disposition.`;
    const extraLinks = [];
    if (key === 'infos_pratiques' && process.env.LINK_PLANNING) {
        extraLinks.push(process.env.LINK_PLANNING);
    }
    if (key === 'inscription') {
        if (process.env.LINK_TARIFS)      extraLinks.push(process.env.LINK_TARIFS);
        if (process.env.LINK_INSCRIPTION) extraLinks.push(process.env.LINK_INSCRIPTION);
    }
    const linkPart = [link, ...extraLinks.filter(l => l && l !== link)]
        .map(l => `\n${l}`)
        .join('');
    return `${greet}${base}${linkPart}`;
}

module.exports = { sendSms, sendWhatsApp, buildSmsBody, isConfigured };
