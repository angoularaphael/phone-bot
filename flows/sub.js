'use strict';

/**
 * Après une réponse : parole = nouvelle question ; 1 SMS · 2 rappel (sauf inscription / après SMS) · * menu.
 */

const { buildRedirect, buildVoiceGather } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { speechOrDigit } = require('../lib/speech');
const { getFollowUp, offersCallback, NO_INPUT, SMS_ALREADY_SENT } = require('../config/messages');
const session = require('../lib/session');

function sub(req, res) {
    const { digit, spoken } = speechOrDigit(req);
    const motif = req.query.motif || 'infos_pratiques';
    const gym = req.query.gym || '';
    const callSid = req.body.CallSid;
    const smsSent = !!session.get(callSid).smsSent;
    const followUp = getFollowUp({ motif, smsSent });

    res.type('text/xml');

    if (spoken) {
        const { converse } = require('./converse');
        return converse(req, res);
    }

    switch (digit) {
        case '1':
            if (smsSent) {
                return res.send(buildVoiceGather({
                    say:     `${SMS_ALREADY_SENT} ${followUp}`,
                    action:  voiceUrl('sub', { motif, gym }),
                    timeout: 6,
                }));
            }
            return res.send(buildRedirect(voiceUrl('collect/name', { motif })));
        case '2':
        case '3':
            if (offersCallback({ motif, smsSent })) {
                return res.send(buildRedirect(voiceUrl('callback', { motif })));
            }
            return res.send(buildVoiceGather({
                say:     NO_INPUT + followUp,
                action:  voiceUrl('sub', { motif, gym }),
                timeout: 6,
            }));
        case '*':
            return res.send(buildRedirect(voiceUrl('menu')));
        default:
            return res.send(buildVoiceGather({
                say:     NO_INPUT + followUp,
                action:  voiceUrl('sub', { motif, gym }),
                timeout: 6,
            }));
    }
}

module.exports = { sub };
