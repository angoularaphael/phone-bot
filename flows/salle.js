'use strict';

const { buildRedirect } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');

function salle(req, res) {
    res.type('text/xml');
    res.send(buildRedirect(voiceUrl('option2')));
}

module.exports = { salle };
