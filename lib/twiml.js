'use strict';

/**
 * Générateurs TwiML / TeXML pour le bot téléphonique Boxing Center.
 * Voix : Amazon Polly Remi Neural (homme, français).
 * VOICE_PROVIDER=telnyx → TeXML Telnyx ; sinon Twilio TwiML.
 */

const twilio = require('twilio');
const { isTelnyx, voicePhoneNumber } = require('./provider');

const VoiceResponse = twilio.twiml.VoiceResponse;

const VOICE    = process.env.BOT_VOICE    || 'Polly.Remi-Neural';
const LANGUAGE = process.env.BOT_LANGUAGE || 'fr-FR';
const SPEECH_RATE = (() => {
    const raw = String(process.env.BOT_SPEECH_RATE || '110%').trim();
    return /^(x-slow|slow|medium|fast|x-fast|\d{2,3}%)$/i.test(raw) ? raw : '120%';
})();

const SPEECH_HINTS =
    'Minimes, Portet, Ramonville, Saint-Cyprien, Cyprien, États-Unis, Reynerie, Mirail, ' +
    'sept ans, quatre ans, trois ans, enfant, fils, fille, baby boxe, boxe éducative, ' +
    'résiliation, horaires, MMA, inscription, facture';

const BRAND_ALIAS = 'Bokcing ceinteur';
const DOMAIN_ALIAS = 'Bokcing ceinteur point F R';
const BRAND_TOKEN_RE =
    /(boutique\.boxingcenter\.fr|www\.boxingcenter\.fr|boxingcenter\.fr|Boxing Center)/gi;

function speechRate(rate) {
    return /^(x-slow|slow|medium|fast|x-fast|\d{2,3}%)$/i.test(String(rate || ''))
        ? String(rate)
        : SPEECH_RATE;
}

function appendPlainWithBreaks(node, text) {
    const re = /([.!?])\s+|;\s+|,\s+/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
        const chunk = text.slice(last, m.index);
        if (chunk) node.addText(chunk);
        if (m[1]) {
            node.addText(m[1]);
            node.break({ time: '250ms' });
        } else if (m[0][0] === ';') {
            node.addText('.');
            node.break({ time: '220ms' });
        } else {
            node.addText(',');
            node.break({ time: '90ms' });
        }
        node.addText(' ');
        last = m.index + m[0].length;
    }
    const rest = text.slice(last);
    if (rest) node.addText(rest);
}

function fillSpoken(node, text) {
    const parts = String(text || '').split(BRAND_TOKEN_RE);
    for (const part of parts) {
        if (!part) continue;
        const key = part.toLowerCase();
        if (key === 'boxing center') {
            node.sub({ alias: BRAND_ALIAS }, 'Boxing Center');
        } else if (key === 'boutique.boxingcenter.fr') {
            node.sub({ alias: `boutique ${DOMAIN_ALIAS}` }, part);
        } else if (key === 'www.boxingcenter.fr' || key === 'boxingcenter.fr') {
            node.sub({ alias: DOMAIN_ALIAS }, part);
        } else {
            appendPlainWithBreaks(node, part);
        }
    }
}

/** SSML natif (pas une chaine echappee) pour que Polly applique vraiment les alias. */
function appendSpoken(parent, text, rate = SPEECH_RATE) {
    if (!text) return null;
    const say = parent.say({ voice: VOICE, language: LANGUAGE });
    const prosody = say.prosody({ rate: speechRate(rate) });
    fillSpoken(prosody, String(text));
    return say;
}

/** Attributs Gather parole : Telnyx (Deepgram) vs Twilio. */
function speechGatherAttrs(extra = {}) {
    if (isTelnyx()) {
        const engine = process.env.BOT_TRANSCRIPTION_ENGINE || 'Deepgram';
        const model =
            process.env.BOT_SPEECH_MODEL ||
            (engine === 'Deepgram' ? 'deepgram/nova-2' : undefined);
        const attrs = {
            language: LANGUAGE,
            method: 'POST',
            profanityFilter: false,
            transcriptionEngine: engine,
            ...extra,
        };
        if (model) attrs.model = model;
        if (engine === 'Deepgram' && model === 'deepgram/nova-2') {
            attrs.hints = SPEECH_HINTS;
        } else if (engine === 'Deepgram' && /nova-3/i.test(String(model))) {
            attrs.keyterms = SPEECH_HINTS;
        } else {
            attrs.hints = SPEECH_HINTS;
        }
        return attrs;
    }
    return {
        language: LANGUAGE,
        method: 'POST',
        speechModel: process.env.BOT_SPEECH_MODEL || 'phone_call',
        bargeIn: true,
        profanityFilter: false,
        hints: SPEECH_HINTS,
        ...extra,
    };
}

/**
 * Message vocal + attente d'une touche DTMF.
 */
function buildGather({ say, action, numDigits = 1, timeout = 10, rate = null, bargeIn = true }) {
    const resp   = new VoiceResponse();
    const gather = resp.gather({
        numDigits,
        action,
        method:  'POST',
        timeout,
        bargeIn,
    });
    if (say) appendSpoken(gather, say, rate);
    resp.redirect({ method: 'POST' }, action);
    return resp.toString();
}

/**
 * Deuxième chiffre d'un code secret, sans phrase.
 */
function buildSilentGather({ action, numDigits = 1, timeout = 4 }) {
    const resp = new VoiceResponse();
    resp.gather({
        numDigits,
        action,
        method: 'POST',
        timeout,
    });
    resp.redirect({ method: 'POST' }, action);
    return resp.toString();
}

function introMusicUrl() {
    if (process.env.INTRO_MUSIC_URL) return process.env.INTRO_MUSIC_URL;
    const base = (process.env.BASE_URL || '').replace(/\/$/, '');
    return base ? `${base}/audio/intro.wav` : null;
}

function holdMusicUrl() {
    if (process.env.HOLD_MUSIC_URL) return process.env.HOLD_MUSIC_URL;
    const base = (process.env.BASE_URL || '').replace(/\/$/, '');
    return base ? `${base}/audio/hold.wav` : null;
}

/**
 * Phrase courte, musique d'attente, puis redirect (ex. pendant que l'IA réfléchit).
 */
function buildPlayThenRedirect({ say = null, play = null, action, pause = 2 }) {
    const resp = new VoiceResponse();
    if (say) appendSpoken(resp, say);
    if (play) {
        resp.play(play);
    } else {
        resp.pause({ length: pause });
    }
    resp.redirect({ method: 'POST' }, action);
    return resp.toString();
}

/**
 * Écoute parole + touche. speechTimeout en secondes (pas auto) :
 * auto coupait trop tôt, l'appelant croyait que David n'écoutait pas.
 */
function buildVoiceGather({ say, action, timeout = 6, speechTimeout = 2, play = null, rate = null }) {
    const resp = new VoiceResponse();
    const gather = resp.gather({
        ...speechGatherAttrs({
            input: isTelnyx() ? 'dtmf speech' : 'speech dtmf',
            numDigits: 1,
            action,
            timeout,
            speechTimeout,
        }),
    });
    if (play) gather.play(play);
    appendSpoken(gather, say, rate);
    resp.redirect({ method: 'POST' }, action);
    return resp.toString();
}

/**
 * Message vocal + bip + attente de parole (speech-to-text).
 * Le bip est joué à l'intérieur du Gather : l'écoute est déjà active
 * quand il retentit, l'appelant peut parler immédiatement après.
 */
function buildSpeechGather({ say, action, timeout = 4, speechTimeout = 'auto' }) {
    const resp   = new VoiceResponse();
    const gather = resp.gather({
        ...speechGatherAttrs({
            input: 'speech',
            action,
            timeout,
            speechTimeout,
        }),
    });
    appendSpoken(gather, say);
    const base = (process.env.BASE_URL || '').replace(/\/$/, '');
    if (base) gather.play(`${base}/audio/beep.wav`);
    resp.redirect({ method: 'POST' }, action);
    return resp.toString();
}

/**
 * Simple message vocal puis redirect vers une URL.
 */
function buildSay(text, redirectUrl = null, rate = null) {
    const resp = new VoiceResponse();
    appendSpoken(resp, text, rate);
    if (redirectUrl) resp.redirect({ method: 'POST' }, redirectUrl);
    return resp.toString();
}

/**
 * Message vocal puis raccroché.
 */
function buildHangup(text = null, rate = null) {
    const resp = new VoiceResponse();
    if (text) appendSpoken(resp, text, rate);
    resp.hangup();
    return resp.toString();
}

/**
 * Transfert vers un numéro humain avec fallback si non répondu.
 */
function buildTransfer({ number, sayBefore, fallbackUrl }) {
    const resp = new VoiceResponse();
    if (sayBefore) {
        appendSpoken(resp, sayBefore);
    }
    const dial = resp.dial({
        callerId: voicePhoneNumber() || undefined,
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
    appendSpoken(resp, say);
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
    buildSilentGather,
    buildVoiceGather,
    buildSpeechGather,
    buildSay,
    buildHangup,
    buildTransfer,
    buildRecord,
    buildRedirect,
    introMusicUrl,
    holdMusicUrl,
    buildPlayThenRedirect,
    VOICE,
    LANGUAGE,
};
