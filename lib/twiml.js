'use strict';

/**
 * Générateurs TwiML pour le bot téléphonique Boxing Center.
 * Voix : Amazon Polly Lea-Neural (française, naturelle).
 */

const twilio = require('twilio');

const VoiceResponse = twilio.twiml.VoiceResponse;

const VOICE    = process.env.BOT_VOICE    || 'Polly.Lea-Neural';
const LANGUAGE = process.env.BOT_LANGUAGE || 'fr-FR';

/**
 * Message vocal + attente d'une touche DTMF.
 */
function buildGather({ say, action, numDigits = 1, timeout = 10 }) {
    const resp   = new VoiceResponse();
    const gather = resp.gather({
        numDigits,
        action,
        method:  'POST',
        timeout,
    });
    gather.say({ voice: VOICE, language: LANGUAGE }, say);
    // Si pas de réponse dans le délai, Twilio exécute la suite
    resp.redirect({ method: 'POST' }, action);
    return resp.toString();
}

/**
 * Message vocal + bip + attente de parole (speech-to-text).
 * Le bip est joué à l'intérieur du Gather : l'écoute est déjà active
 * quand il retentit, l'appelant peut parler immédiatement après.
 */
function buildSpeechGather({ say, action, timeout = 4 }) {
    const resp   = new VoiceResponse();
    const gather = resp.gather({
        input:         'speech',
        language:      'fr-FR',
        action,
        method:        'POST',
        timeout,
        speechTimeout: 'auto',
    });
    gather.say({ voice: VOICE, language: LANGUAGE }, say);
    const base = (process.env.BASE_URL || '').replace(/\/$/, '');
    if (base) gather.play(`${base}/audio/beep.wav`);
    resp.redirect({ method: 'POST' }, action);
    return resp.toString();
}

/**
 * Simple message vocal puis redirect vers une URL.
 */
function buildSay(text, redirectUrl = null) {
    const resp = new VoiceResponse();
    resp.say({ voice: VOICE, language: LANGUAGE }, text);
    if (redirectUrl) resp.redirect({ method: 'POST' }, redirectUrl);
    return resp.toString();
}

/**
 * Message vocal puis raccroché.
 */
function buildHangup(text = null) {
    const resp = new VoiceResponse();
    if (text) resp.say({ voice: VOICE, language: LANGUAGE }, text);
    resp.hangup();
    return resp.toString();
}

/**
 * Transfert vers un numéro humain avec fallback si non répondu.
 */
function buildTransfer({ number, sayBefore, fallbackUrl }) {
    const resp = new VoiceResponse();
    if (sayBefore) {
        resp.say({ voice: VOICE, language: LANGUAGE }, sayBefore);
    }
    const dial = resp.dial({
        callerId: process.env.TWILIO_PHONE_NUMBER || undefined,
        timeout:  20,
        action:   fallbackUrl || undefined,
        method:   'POST',
    });
    dial.number(number);
    return resp.toString();
}

/**
 * Enregistrement d'un message vocal (répondeur).
 */
function buildRecord({ say, action, maxLength = 60 }) {
    const resp = new VoiceResponse();
    resp.say({ voice: VOICE, language: LANGUAGE }, say);
    resp.record({
        action,
        method:          'POST',
        maxLength,
        playBeep:        true,
        transcribe:      false,
    });
    return resp.toString();
}

/**
 * Simple redirect TwiML (utile pour chaîner les handlers).
 */
function buildRedirect(url) {
    const resp = new VoiceResponse();
    resp.redirect({ method: 'POST' }, url);
    return resp.toString();
}

module.exports = {
    buildGather,
    buildSpeechGather,
    buildSay,
    buildHangup,
    buildTransfer,
    buildRecord,
    buildRedirect,
    VOICE,
    LANGUAGE,
};
