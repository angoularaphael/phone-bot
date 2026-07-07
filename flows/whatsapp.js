'use strict';

/**
 * Collecte des coordonnées et envoi du message WhatsApp.
 *
 * Étape 1 — /voice/whatsapp/name?motif=...
 *   Demande le prénom par reconnaissance vocale.
 *
 * Étape 2 — /voice/whatsapp/phone?motif=...&name=...
 *   Si From est un mobile → envoi direct.
 *   Sinon → demande le numéro WhatsApp via DTMF (10 chiffres).
 *
 * Étape 3 — /voice/whatsapp/save?motif=...&name=...
 *   Envoie le message WhatsApp et confirme.
 */

const { buildSpeechGather, buildGather, buildRedirect } = require('../lib/twiml');
const { voiceUrl }          = require('../lib/url');
const { sendWhatsApp, buildSmsBody } = require('../lib/sms');
const { updateCall }        = require('../lib/tracker');
const { getRoute }          = require('../config/routing');
const { log, warn }         = require('../lib/logger');
const {
    COLLECT_NAME_WA,
    COLLECT_PHONE_WA,
    WHATSAPP_CONFIRM,
    OUTRO,
} = require('../config/messages');

// ─── Étape 1 : Prénom ────────────────────────────────────────────────────────

function whatsappName(req, res) {
    const motif = req.query.motif || 'autre';

    res.type('text/xml');
    res.send(buildSpeechGather({
        say:     COLLECT_NAME_WA,
        action:  voiceUrl('whatsapp/phone', { motif }),
        timeout: 5,
    }));
}

// ─── Étape 2 : Numéro WhatsApp ────────────────────────────────────────────────

function whatsappPhone(req, res) {
    const motif  = req.query.motif || 'autre';
    const name   = (req.body.SpeechResult || '').trim().split(' ')[0];
    const caller = req.body.From || '';

    if (isMobile(caller)) {
        const params = new URLSearchParams({ motif, name: name || '', phone: caller });
        return res.type('text/xml').send(
            buildRedirect(`${voiceUrl('whatsapp/save')}?${params}`)
        );
    }

    res.type('text/xml');
    res.send(buildGather({
        say:       COLLECT_PHONE_WA,
        action:    voiceUrl('whatsapp/save', { motif, name: name || '' }),
        numDigits: 10,
        timeout:   15,
    }));
}

// ─── Étape 3 : Envoi WhatsApp + confirmation ─────────────────────────────────

async function whatsappSave(req, res) {
    const motif   = req.query.motif  || 'autre';
    const name    = (req.query.name  || '').trim();
    const callSid = req.body.CallSid;
    const caller  = req.body.From    || '';

    const rawPhone = (req.body.Digits || req.query.phone || caller || '').replace(/\s/g, '');
    const toPhone  = normalizePhone(rawPhone);

    const route = getRoute(motif);
    const link  = route.smsLink || '';

    const body = buildSmsBody(motif, name || null, link);

    let waSent  = false;
    let waError = null;

    if (toPhone) {
        const result = await sendWhatsApp({ to: toPhone, body });
        waSent  = result.ok;
        waError = result.error || null;
    } else {
        warn(`whatsappSave — pas de numéro valide pour CallSid ${callSid}`);
    }

    await updateCall(callSid, {
        callerName:   name    || null,
        callerPhone:  toPhone || null,
        whatsappSent: waSent,
        status:       'completed',
        notes:        waError ? `wa_error:${waError}` : null,
    });

    log(`💬 WhatsApp — CallSid: ${callSid}  Prénom: ${name || '(vide)'}  Tel: ${toPhone || '?'}  WA: ${waSent}`);

    const confirmText = WHATSAPP_CONFIRM(name) + ' ' + OUTRO;
    res.type('text/xml');
    res.send(buildGather({
        say:       confirmText,
        action:    voiceUrl('dispatch'),
        numDigits: 1,
        timeout:   8,
    }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isMobile(number) {
    if (!number) return false;
    const clean = number.replace(/[\s\-().]/g, '');
    return /^\+336|^\+337|^06|^07/.test(clean);
}

function normalizePhone(raw) {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 9)  return `+33${digits}`;
    if (digits.length === 10) return `+33${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('33')) return `+${digits}`;
    if (digits.length === 12 && digits.startsWith('33')) return `+${digits}`;
    return raw.startsWith('+') ? raw : null;
}

module.exports = { whatsappName, whatsappPhone, whatsappSave };
