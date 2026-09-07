'use strict';

/**
 * Sous-menu touche 2 : horaires, planning (salles), disciplines.
 */

const { buildVoiceGather, buildRedirect } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { PRATIQUE_MENU, PRATIQUE_MENU_REPEAT } = require('../config/messages');
const { speechOrDigit } = require('../lib/speech');

function pratique(req, res) {
    const { digit, speech, spoken } = speechOrDigit(req);

    res.type('text/xml');

    if (digit === '*' && !spoken) {
        return res.send(buildRedirect(voiceUrl('menu')));
    }

    if (!digit && !speech) {
        return res.send(buildVoiceGather({
            say:     PRATIQUE_MENU,
            action:  voiceUrl('pratique'),
            timeout: 6,
        }));
    }

    const t = `${digit} ${speech}`.toLowerCase();

    if (!spoken && (digit === '1' || /\bhoraire/.test(t))) {
        return res.send(buildRedirect(voiceUrl('answer', { motif: 'infos_pratiques' })));
    }
    if (!spoken && (digit === '2' || /\bplanning|cours/.test(t))) {
        return res.send(buildRedirect(voiceUrl('salle')));
    }
    if (!spoken && (digit === '3' || /\bdiscipline|activit/.test(t))) {
        return res.send(buildRedirect(voiceUrl('answer', { motif: 'disciplines' })));
    }

    if (spoken) {
        const { converse } = require('./converse');
        return converse(req, res);
    }

    return res.send(buildVoiceGather({
        say:     PRATIQUE_MENU_REPEAT,
        action:  voiceUrl('pratique'),
        timeout: 6,
    }));
}

module.exports = { pratique };
