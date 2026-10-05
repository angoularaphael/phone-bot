'use strict';

/**
 * Aiguillage menu — touches 1 / 2 / 3 uniquement.
 * Pas de conversation libre. Menu interne 99 conserve.
 */

const { buildGather, buildHangup, buildRedirect } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { getMotifByDigit } = require('../config/routing');
const { updateCall } = require('../lib/tracker');
const { log } = require('../lib/logger');
const { MENU_REPEAT, GOODBYE, RATE_FAST } = require('../config/messages');

async function dispatch(req, res) {
    const digit = String(req.body.Digits || '').trim();
    const callSid = req.body.CallSid;

    res.type('text/xml');

    const { tryOpenTrain } = require('./train');
    if (tryOpenTrain(digit, res)) return;

    if (!digit || digit === '*') {
        return res.send(buildGather({
            say: MENU_REPEAT,
            action: voiceUrl('dispatch'),
            timeout: 6,
            rate: RATE_FAST,
        }));
    }

    const motif = getMotifByDigit(digit);
    log(`Dispatch — CallSid: ${callSid}  Touche: ${digit}  Motif: ${motif || '?'}`);
    if (motif) await updateCall(callSid, { motif, rawDigits: digit });

    if (digit === '1') return res.send(buildRedirect(voiceUrl('option1')));
    if (digit === '2') return res.send(buildRedirect(voiceUrl('option2')));
    if (digit === '3') return res.send(buildRedirect(voiceUrl('option3')));

    return res.send(buildHangup(
        `Merci. Consultez boxingcenter.fr ou la boutique Boxing Center. ${GOODBYE}`,
        RATE_FAST
    ));
}

module.exports = { dispatch };
