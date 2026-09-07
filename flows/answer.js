'use strict';

/**
 * Réponse vocale figée (secours) puis retour à la conversation.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { getAnswer, FOLLOW_UP } = require('../config/messages');

function answer(req, res) {
    const motif = req.query.motif || 'infos_pratiques';
    const twiml = buildVoiceGather({
        say:     `${getAnswer(motif)} ${FOLLOW_UP}`,
        action:  voiceUrl('converse', { phase: 'after' }),
        timeout: 8,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { answer };
