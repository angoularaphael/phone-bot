'use strict';

/**
 * Après une réponse : 1 SMS · 2 WhatsApp · 3 rappel · * menu.
 * Aucune touche conseiller.
 */

const { buildRedirect, buildGather } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { SUB_MENU, NO_INPUT } = require('../config/messages');

function sub(req, res) {
    const digit = req.body.Digits;
    const speech = (req.body.SpeechResult || '').trim();
    const motif = req.query.motif || 'infos_pratiques';
    const gym = req.query.gym || '';

    res.type('text/xml');

    if (speech && !digit) {
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
            return res.send(buildRedirect(voiceUrl('menu')));
        default:
            return res.send(buildGather({
                say:       NO_INPUT + SUB_MENU,
                action:    voiceUrl('sub', { motif, gym }),
                numDigits: 1,
                timeout:   10,
            }));
    }
}

module.exports = { sub };
