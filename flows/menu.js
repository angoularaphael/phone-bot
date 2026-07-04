'use strict';

/**
 * Menu principal — peut être rappelé depuis n'importe quel sous-flux.
 */

const { buildGather }        = require('../lib/twiml');
const { voiceUrl }           = require('../lib/url');
const { MENU, MENU_REPEAT }  = require('../config/messages');

function menu(req, res) {
    const repeated = req.query.repeat === '1';
    const twiml = buildGather({
        say:       repeated ? MENU_REPEAT : MENU,
        action:    voiceUrl('dispatch'),
        numDigits: 1,
        timeout:   12,
    });
    res.type('text/xml');
    res.send(twiml);
}

module.exports = { menu };
