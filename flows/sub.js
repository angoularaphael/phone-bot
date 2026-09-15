'use strict';

/**
 * Après une réponse : parole = nouvelle question ; 1 SMS · * menu.
 */

const { buildRedirect, buildVoiceGather } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { speechOrDigit } = require('../lib/speech');
const { getFollowUp, NO_INPUT, SMS_ALREADY_SENT } = require('../config/messages');
const { resolveSmsMotif } = require('../lib/sms');
const session = require('../lib/session');

function sub(req, res) {
    const { digit, spoken } = speechOrDigit(req);
    const gym = req.query.gym || '';
    const callSid = req.body.CallSid;
    const sess = session.get(callSid);
    const motif = resolveSmsMotif(sess.lastMotif || req.query.motif || 'autre', sess);
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
        case '*':
            return res.send(buildRedirect(voiceUrl('menu')));
        default: {
            const { tryOpenTrain } = require('./train');
            if (tryOpenTrain(digit, res)) return;
            return res.send(buildVoiceGather({
                say:     NO_INPUT + followUp,
                action:  voiceUrl('sub', { motif, gym }),
                timeout: 6,
            }));
        }
    }
}

module.exports = { sub };
