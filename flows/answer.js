'use strict';

/**
 * Ancien parcours long désactivé — recentre vers les 3 options.
 */

const { buildRedirect } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');

function answer(req, res) {
    const motif = req.query.motif || '';
    res.type('text/xml');
    if (motif === 'administratif') return res.send(buildRedirect(voiceUrl('option3')));
    if (motif === 'inscription' || motif === 'tarifs' || motif === 'seance_essai') {
        return res.send(buildRedirect(voiceUrl('option1')));
    }
    return res.send(buildRedirect(voiceUrl('option2')));
}

module.exports = { answer };
