'use strict';

/**
 * Collecte des coordonnées pour l'envoi du SMS.
 *
 * Étape 1 — /voice/collect/name?motif=...
 *   Demande le prénom de l'appelant par reconnaissance vocale.
 *
 * Étape 2 — /voice/collect/phone?motif=...&name=...
 *   Si le numéro appelant (From) n'est pas un mobile évident,
 *   demande le numéro de téléphone via DTMF (10 chiffres).
 *   Sinon, saute directement à l'étape 3.
 *
 * Étape 3 — /voice/collect/save?motif=...&name=...
 *   Envoie le SMS et confirme.
 */

const { buildSpeechGather, buildGather, buildSay, buildRedirect } = require('../lib/twiml');
const { voiceUrl }    = require('../lib/url');
const { sendSms, buildSmsBody } = require('../lib/sms');
const { updateCall }  = require('../lib/tracker');
const { getRoute }    = require('../config/routing');
const { log, warn }   = require('../lib/logger');
const {
    COLLECT_NAME,
    COLLECT_NAME_FALLBACK,
    COLLECT_PHONE,
    SMS_CONFIRM,
    OUTRO,
} = require('../config/messages');

// ─── Étape 1 : Prénom ────────────────────────────────────────────────────────

function collectName(req, res) {
    const motif = req.query.motif || 'autre';

    const twiml = buildSpeechGather({
        say:    COLLECT_NAME,
        action: voiceUrl('collect/phone', { motif }),
        timeout: 5,
    });

    res.type('text/xml');
    res.send(twiml);
}

// ─── Étape 2 : Numéro (si From n'est pas mobile) ─────────────────────────────

function collectPhone(req, res) {
    const motif  = req.query.motif || 'autre';
    const name   = (req.body.SpeechResult || '').trim().split(' ')[0]; // premier mot = prénom
    const caller = req.body.From || '';

    // Si le numéro From ressemble à un mobile (commence par +336, +337, 06, 07),
    // on saute la collecte du numéro et on envoie directement.
    if (isMobile(caller)) {
        const params = new URLSearchParams({ motif, name: name || '', phone: caller });
        return res.type('text/xml').send(
            buildRedirect(`${voiceUrl('collect/save')}?${params}`)
        );
    }

    // Sinon, demande le numéro
    const twiml = buildGather({
        say:       COLLECT_PHONE,
        action:    voiceUrl('collect/save', { motif, name: name || '' }),
        numDigits: 10,
        timeout:   15,
    });

    res.type('text/xml');
    res.send(twiml);
}

// ─── Étape 3 : Envoi SMS + confirmation ──────────────────────────────────────

async function collectSave(req, res) {
    const motif    = req.query.motif   || 'autre';
    const name     = (req.query.name   || '').trim();
    const callSid  = req.body.CallSid;
    const caller   = req.body.From     || '';

    // Numéro cible : priorité au DTMF saisi, sinon numéro appelant
    const rawPhone  = (req.body.Digits || req.query.phone || caller || '').replace(/\s/g, '');
    const toPhone   = normalizePhone(rawPhone);

    const route = getRoute(motif);
    const link  = route.smsLink || '';

    const body = buildSmsBody(motif, name || null, link);

    let smsSent = false;
    let smsError = null;

    if (toPhone) {
        const result = await sendSms({ to: toPhone, body });
        smsSent  = result.ok;
        smsError = result.error || null;
    } else {
        warn(`collectSave — pas de numéro valide pour CallSid ${callSid}`);
    }

    await updateCall(callSid, {
        callerName:  name   || null,
        callerPhone: toPhone || null,
        smsSent,
        status: 'completed',
        notes:  smsError ? `sms_error:${smsError}` : null,
    });

    log(`📋 Collecte — CallSid: ${callSid}  Prénom: ${name || '(vide)'}  Tel: ${toPhone || '?'}  SMS: ${smsSent}`);

    const confirmText = SMS_CONFIRM(name) + ' ' + OUTRO;
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
    if (digits.length === 9)  return `+33${digits}`;           // 6XXXXXXXX
    if (digits.length === 10) return `+33${digits.slice(1)}`;  // 0XXXXXXXXX
    if (digits.length === 11 && digits.startsWith('33')) return `+${digits}`;
    if (digits.length === 12 && digits.startsWith('33')) return `+${digits}`;
    return raw.startsWith('+') ? raw : null;
}

module.exports = { collectName, collectPhone, collectSave };
