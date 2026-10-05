'use strict';

/**
 * Ancien sous-menu pratique → option 2 (site + SMS).
 */

const { buildRedirect } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');

function pratique(req, res) {
    res.type('text/xml');
    res.send(buildRedirect(voiceUrl('option2')));
}

module.exports = { pratique };
