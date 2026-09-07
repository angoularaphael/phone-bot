'use strict';

/**
 * Réponse vocale figée + sous-menu SMS / rappel.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { getAnswer, SUB_MENU } = require('../config/messages');
const { SPOKEN_PLANNING } = require('../config/kb');

function answer(req, res) {
    const motif = req.query.motif || 'infos_pratiques';
    const gym   = req.query.gym || '';
    const body  = (gym && SPOKEN_PLANNING[gym]) ? SPOKEN_PLANNING[gym] : getAnswer(motif);

    const twiml = buildVoiceGather({
        say:     `${body} ${SUB_MENU}`,
        action:  voiceUrl('sub', { motif, gym }),
        timeout: 10,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { answer };
