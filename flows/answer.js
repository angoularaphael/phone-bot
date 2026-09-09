'use strict';

/**
 * Réponse vocale figée + sous-menu SMS / rappel.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { getAnswer, getFollowUp } = require('../config/messages');
const { SPOKEN_PLANNING } = require('../config/kb');
const session = require('../lib/session');

function answer(req, res) {
    const motif = req.query.motif || 'infos_pratiques';
    const gym   = req.query.gym || '';
    const smsSent = !!session.get(req.body.CallSid).smsSent;
    const body  = (gym && SPOKEN_PLANNING[gym]) ? SPOKEN_PLANNING[gym] : getAnswer(motif);

    const twiml = buildVoiceGather({
        say:     `${body} ${getFollowUp({ motif, smsSent })}`,
        action:  voiceUrl('sub', { motif, gym }),
        timeout: 6,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { answer };
