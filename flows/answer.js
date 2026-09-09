'use strict';

/**
 * Réponse vocale figée + sous-menu SMS.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { getAnswer, getFollowUp } = require('../config/messages');
const { SPOKEN_PLANNING } = require('../config/kb');
const session = require('../lib/session');

function answer(req, res) {
    const motif = req.query.motif || 'infos_pratiques';
    const gym   = req.query.gym || '';
    const callSid = req.body.CallSid;
    const smsSent = !!session.get(callSid).smsSent;
    const body  = (gym && SPOKEN_PLANNING[gym]) ? SPOKEN_PLANNING[gym] : getAnswer(motif);

    session.touch(callSid, {
        lastMotif: motif,
        lastGym: gym || session.get(callSid).lastGym || null,
        lastQuestion: gym ? `planning ${gym}` : (session.get(callSid).lastQuestion || motif),
    });

    const twiml = buildVoiceGather({
        say:     `${body} ${getFollowUp({ motif, smsSent })}`,
        action:  voiceUrl('sub', { motif, gym }),
        timeout: 6,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { answer };
