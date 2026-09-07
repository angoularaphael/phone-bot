'use strict';

/**
 * Reprise d'écoute — même accueil conversationnel.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { WELCOME, ASK_REPEAT } = require('../config/messages');

function menu(req, res) {
    const repeated = req.query.repeat === '1';
    const twiml = buildVoiceGather({
        say:     repeated ? ASK_REPEAT : WELCOME,
        action:  voiceUrl('converse'),
        timeout: 8,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { menu };
