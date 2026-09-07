'use strict';

/**
 * Après une réponse vocale (flux historique).
 * 1 SMS · 2 WhatsApp · 3 rappel · parole = nouvelle question.
 * Plus de touche « conseiller ».
 */

const { buildRedirect, buildVoiceGather } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { FOLLOW_UP, NO_INPUT } = require('../config/messages');

function sub(req, res) {
    const digit = req.body.Digits;
    const speech = (req.body.SpeechResult || '').trim();
    const motif = req.query.motif || 'infos_pratiques';

    res.type('text/xml');

    if (speech) {
        const { converse } = require('./converse');
        return converse(req, res);
    }

    switch (digit) {
        case '1':
            return res.send(buildRedirect(voiceUrl('collect/name', { motif })));
        case '2':
            return res.send(buildRedirect(voiceUrl('whatsapp/name', { motif })));
        case '3':
            return res.send(buildRedirect(voiceUrl('callback', { motif })));
        case '*':
            return res.send(buildRedirect(voiceUrl('bye')));
        case '4':
        case '5':
            return res.send(buildRedirect(voiceUrl('human', { motif })));
        default:
            return res.send(buildVoiceGather({
                say:     NO_INPUT + FOLLOW_UP,
                action:  voiceUrl('converse', { phase: 'after' }),
                timeout: 8,
            }));
    }
}

module.exports = { sub };
