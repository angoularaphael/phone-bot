'use strict';

/**
 * Sous-menu désactivé — raccroche (brief : pas de conversation longue).
 */

const { buildHangup } = require('../lib/twiml');
const { GOODBYE, RATE_FAST } = require('../config/messages');

function sub(req, res) {
    res.type('text/xml');
    res.send(buildHangup(GOODBYE, RATE_FAST));
}

module.exports = { sub };
