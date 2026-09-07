'use strict';

/**
 * Aiguillage menu David.
 *   1 → horaires
 *   2 → tarifs / essai
 *   3 → sous-menu salles (planning)
 *   4 → résiliation
 * Parole → conversation de secours.
 */

const { buildVoiceGather, buildRedirect } = require('../lib/twiml');
const { voiceUrl }            = require('../lib/url');
const { getMotifByDigit }     = require('../config/routing');
const { updateCall }          = require('../lib/tracker');
const { log }                 = require('../lib/logger');
const { MENU_REPEAT }         = require('../config/messages');

async function dispatch(req, res) {
    const digit   = req.body.Digits;
    const speech  = (req.body.SpeechResult || '').trim();
    const callSid = req.body.CallSid;

    res.type('text/xml');

    if (speech && !digit) {
        const { converse } = require('./converse');
        return converse(req, res);
    }

    if (!digit || digit === '*') {
        return res.send(buildVoiceGather({
            say:     MENU_REPEAT,
            action:  voiceUrl('dispatch'),
            timeout: 10,
        }));
    }

    const motif = getMotifByDigit(digit);
    log(`🎯 Dispatch — CallSid: ${callSid}  Touche: ${digit}  Motif: ${motif || '?'}`);
    if (motif) await updateCall(callSid, { motif, rawDigits: digit });

    if (digit === '3' || motif === 'planning') {
        return res.send(buildRedirect(voiceUrl('salle')));
    }

    if (motif) {
        return res.send(buildRedirect(voiceUrl('answer', { motif })));
    }

    return res.send(buildVoiceGather({
        say:     MENU_REPEAT,
        action:  voiceUrl('dispatch'),
        timeout: 10,
    }));
}

module.exports = { dispatch };
