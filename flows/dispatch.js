'use strict';

/**
 * Aiguillage de secours — touches 1-4 = questions synthétiques vers la conversation.
 * Plus de transfert (ancienne touche 5).
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }                   = require('../lib/url');
const { getMotifByDigit }            = require('../config/routing');
const { updateCall }                 = require('../lib/tracker');
const { log }                        = require('../lib/logger');
const { ASK_DTMF_HINT }              = require('../config/messages');
const { DTMF_ASK }                   = require('./converse');

async function dispatch(req, res) {
    const digit   = req.body.Digits;
    const speech  = (req.body.SpeechResult || '').trim();
    const callSid = req.body.CallSid;

    res.type('text/xml');

    if (speech) {
        const { converse } = require('./converse');
        return converse(req, res);
    }

    if (!digit || digit === '*') {
        return res.send(buildVoiceGather({
            say:     ASK_DTMF_HINT,
            action:  voiceUrl('converse'),
            timeout: 8,
        }));
    }

    const motif = getMotifByDigit(digit);
    log(`🎯 Dispatch — CallSid: ${callSid}  Touche: ${digit}  Motif: ${motif || 'converse'}`);
    if (motif) await updateCall(callSid, { motif, rawDigits: digit });

    if (DTMF_ASK[digit]) {
        req.body.SpeechResult = DTMF_ASK[digit];
        req.body.Digits = '';
        const { converse } = require('./converse');
        return converse(req, res);
    }

    return res.send(buildVoiceGather({
        say:     ASK_DTMF_HINT,
        action:  voiceUrl('converse'),
        timeout: 8,
    }));
}

module.exports = { dispatch };
