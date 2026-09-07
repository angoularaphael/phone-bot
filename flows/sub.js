'use strict';

/**
 * Après une réponse : parole = nouvelle question ; 1 SMS · 2 rappel · * menu.
 */

const { buildRedirect, buildVoiceGather } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { speechOrDigit } = require('../lib/speech');
const { SUB_MENU, NO_INPUT } = require('../config/messages');

function sub(req, res) {
    const { digit, spoken } = speechOrDigit(req);
    const motif = req.query.motif || 'infos_pratiques';
    const gym = req.query.gym || '';

    res.type('text/xml');

    if (spoken) {
        const { converse } = require('./converse');
        return converse(req, res);
    }

    switch (digit) {
        case '1':
            return res.send(buildRedirect(voiceUrl('collect/name', { motif })));
        case '2':
        case '3':
            return res.send(buildRedirect(voiceUrl('callback', { motif })));
        case '*':
            return res.send(buildRedirect(voiceUrl('menu')));
        default:
            return res.send(buildVoiceGather({
                say:     NO_INPUT + SUB_MENU,
                action:  voiceUrl('sub', { motif, gym }),
                timeout: 6,
            }));
    }
}

module.exports = { sub };
