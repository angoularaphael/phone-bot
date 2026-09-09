'use strict';

/**
 * Menu principal — 4 touches.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { MENU, MENU_REPEAT } = require('../config/messages');

function menu(req, res) {
    const repeated = req.query.repeat === '1';
    const twiml = buildVoiceGather({
        say:     repeated ? MENU_REPEAT : MENU,
        action:  voiceUrl('dispatch'),
        timeout: 6,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { menu };
