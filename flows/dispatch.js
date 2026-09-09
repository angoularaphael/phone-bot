'use strict';

/**
 * Aiguillage menu David.
 * Touches 1–4, ou question parlée → converse (Gemini / Groq).
 */

const { buildVoiceGather, buildRedirect } = require('../lib/twiml');
const { voiceUrl }            = require('../lib/url');
const { getMotifByDigit }     = require('../config/routing');
const { updateCall }          = require('../lib/tracker');
const { log }                 = require('../lib/logger');
const { speechOrDigit }       = require('../lib/speech');
const { MENU_REPEAT }         = require('../config/messages');

async function dispatch(req, res) {
    const { digit, speech, spoken } = speechOrDigit(req);
    const callSid = req.body.CallSid;

    res.type('text/xml');

    if (spoken) {
        log(`🗣️  Dispatch parole — CallSid: ${callSid}  « ${speech.slice(0, 80)} »`);
        const { converse } = require('./converse');
        return converse(req, res);
    }

    const { tryOpenTrain } = require('./train');
    if (tryOpenTrain(digit, res)) return;

    if (!digit || digit === '*') {
        return res.send(buildVoiceGather({
            say:     MENU_REPEAT,
            action:  voiceUrl('dispatch'),
            timeout: 6,
        }));
    }

    const motif = getMotifByDigit(digit);
    log(`🎯 Dispatch — CallSid: ${callSid}  Touche: ${digit}  Motif: ${motif || '?'}`);
    if (motif) await updateCall(callSid, { motif, rawDigits: digit });

    if (digit === '2' || motif === 'planning') {
        return res.send(buildRedirect(voiceUrl('pratique')));
    }

    if (motif) {
        return res.send(buildRedirect(voiceUrl('answer', { motif })));
    }

    return res.send(buildVoiceGather({
        say:     MENU_REPEAT,
        action:  voiceUrl('dispatch'),
        timeout: 6,
    }));
}

module.exports = { dispatch };
