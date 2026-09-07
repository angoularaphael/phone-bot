'use strict';

/**
 * Sous-menu planning : 1 Minimes · 2 Portet · 3 Ramonville · 4 Saint-Cyprien · 5 États-Unis
 */

const { buildVoiceGather, buildRedirect } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { detectGyms, SPOKEN_PLANNING } = require('../config/kb');
const { SALLE_MENU, SALLE_MENU_REPEAT } = require('../config/messages');
const { log } = require('../lib/logger');

const GYM_DIGIT = {
    1: 'minimes',
    2: 'portet',
    3: 'ramonville',
    4: 'st-cyprien',
    5: 'etats-unis',
};

function salle(req, res) {
    const digit   = (req.body.Digits || '').trim();
    const speech  = (req.body.SpeechResult || '').trim();
    const callSid = req.body.CallSid;

    res.type('text/xml');

    if (digit === '*') {
        return res.send(buildRedirect(voiceUrl('menu')));
    }

    if (!digit && !speech) {
        return res.send(buildVoiceGather({
            say:     SALLE_MENU,
            action:  voiceUrl('salle'),
            timeout: 10,
        }));
    }

    let gym = GYM_DIGIT[digit] || null;
    if (!gym && speech) {
        const ids = detectGyms(speech);
        gym = ids[0] || null;
    }

    if (!gym || !SPOKEN_PLANNING[gym]) {
        return res.send(buildVoiceGather({
            say:     SALLE_MENU_REPEAT,
            action:  voiceUrl('salle'),
            timeout: 10,
        }));
    }

    log(`📍 Salle — CallSid: ${callSid}  ${gym}`);
    return res.send(buildRedirect(voiceUrl('answer', { motif: 'planning', gym })));
}

module.exports = { salle, GYM_DIGIT };
