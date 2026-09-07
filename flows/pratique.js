'use strict';

/**
 * Sous-menu touche 2 : horaires, planning (salles), disciplines.
 */

const { buildVoiceGather, buildRedirect } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { PRATIQUE_MENU, PRATIQUE_MENU_REPEAT } = require('../config/messages');

function pratique(req, res) {
    const digit  = (req.body.Digits || '').trim();
    const speech = (req.body.SpeechResult || '').trim();

    res.type('text/xml');

    if (digit === '*') {
        return res.send(buildRedirect(voiceUrl('menu')));
    }

    if (!digit && !speech) {
        return res.send(buildVoiceGather({
            say:     PRATIQUE_MENU,
            action:  voiceUrl('pratique'),
            timeout: 10,
        }));
    }

    const t = `${digit} ${speech}`.toLowerCase();

    if (digit === '1' || /\bhoraire/.test(t)) {
        return res.send(buildRedirect(voiceUrl('answer', { motif: 'infos_pratiques' })));
    }
    if (digit === '2' || /\bplanning|cours/.test(t)) {
        return res.send(buildRedirect(voiceUrl('salle')));
    }
    if (digit === '3' || /\bdiscipline|activit/.test(t)) {
        return res.send(buildRedirect(voiceUrl('answer', { motif: 'disciplines' })));
    }

    return res.send(buildVoiceGather({
        say:     PRATIQUE_MENU_REPEAT,
        action:  voiceUrl('pratique'),
        timeout: 10,
    }));
}

module.exports = { pratique };
