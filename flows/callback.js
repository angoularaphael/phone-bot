'use strict';

/**
 * Ancienne demande de rappel : plus proposée.
 * On reste en ligne et on continue la conversation.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const session = require('../lib/session');
const { getFollowUp } = require('../config/messages');

async function callback(req, res) {
    const motif   = req.query.motif || 'autre';
    const callSid = req.body.CallSid;
    const smsSent = !!session.get(callSid).smsSent;

    const twiml = buildVoiceGather({
        say:     `Je reste avec vous. ${getFollowUp({ motif, smsSent })}`,
        action:  voiceUrl('sub', { motif }),
        timeout: 10,
    });

    res.type('text/xml');
    res.send(twiml);
}

module.exports = { callback };
