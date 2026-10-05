'use strict';

/**
 * Menu principal — 3 touches, DTMF seul.
 */

const { buildGather } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { MENU, MENU_REPEAT, RATE_FAST } = require('../config/messages');

function menu(req, res) {
    const repeated = req.query.repeat === '1';
    const twiml = buildGather({
        say: repeated ? MENU_REPEAT : MENU,
        action: voiceUrl('dispatch'),
        timeout: 6,
        rate: RATE_FAST,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { menu };
