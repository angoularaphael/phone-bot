'use strict';

/**
 * Accueil David — 3 touches, DTMF seul, anti-abus, pas de musique.
 */

const { buildGather, buildHangup } = require('../lib/twiml');
const { saveCall } = require('../lib/tracker');
const { voiceUrl } = require('../lib/url');
const { log } = require('../lib/logger');
const { WELCOME, BLOCKED_MSG, RATE_FAST } = require('../config/messages');
const { isBlocked, registerCall } = require('../lib/rate-limit');

async function welcome(req, res) {
    const callSid = req.body.CallSid;
    const caller = req.body.From || 'unknown';
    const called = req.body.To || require('../lib/provider').voicePhoneNumber() || '';

    res.type('text/xml');

    const blocked = await isBlocked(caller);
    if (blocked.blocked) {
        log(`Appel bloque — CallSid: ${callSid}  De: ${caller}`);
        await saveCall({ callSid, caller, called, status: 'blocked', notes: 'rate_limit_24h' });
        return res.send(buildHangup(BLOCKED_MSG, RATE_FAST));
    }

    const abuse = await registerCall(caller);
    if (abuse.blocked) {
        log(`Anti-abus declenche — CallSid: ${callSid}  De: ${caller}`);
        await saveCall({ callSid, caller, called, status: 'blocked', notes: 'rate_limit_24h' });
        return res.send(buildHangup(BLOCKED_MSG, RATE_FAST));
    }

    log(`Appel entrant — CallSid: ${callSid}  De: ${caller}  Vers: ${called}  (n=${abuse.count || 1})`);
    await saveCall({ callSid, caller, called, status: 'in_progress' });

    return res.send(buildGather({
        say: WELCOME,
        action: voiceUrl('dispatch'),
        timeout: 8,
        rate: RATE_FAST,
    }));
}

module.exports = { welcome };
