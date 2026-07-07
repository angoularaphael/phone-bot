'use strict';

/**
 * Aiguillage principal — reçoit la touche du menu et route vers le bon handler.
 *
 * Digit → Motif
 *   1 → infos_pratiques  (horaires + planning)
 *   2 → inscription      (tarifs + essai + inscription)
 *   3 → competition
 *   4 → administratif
 *   5 → humain (transfert direct)
 *   * → retour menu
 */

const { buildGather, buildRedirect } = require('../lib/twiml');
const { voiceUrl }                   = require('../lib/url');
const { getMotifByDigit }            = require('../config/routing');
const { updateCall }                 = require('../lib/tracker');
const { log }                        = require('../lib/logger');
const { MENU_REPEAT }                = require('../config/messages');

async function dispatch(req, res) {
    const digit   = req.body.Digits;
    const callSid = req.body.CallSid;

    // Retour au menu ou pas de saisie
    if (!digit || digit === '*') {
        const twiml = buildGather({
            say:       MENU_REPEAT,
            action:    voiceUrl('dispatch'),
            numDigits: 1,
            timeout:   12,
        });
        res.type('text/xml');
        return res.send(twiml);
    }

    const motif = getMotifByDigit(digit);

    if (!motif) {
        const twiml = buildGather({
            say:       MENU_REPEAT,
            action:    voiceUrl('dispatch'),
            numDigits: 1,
            timeout:   12,
        });
        res.type('text/xml');
        return res.send(twiml);
    }

    log(`🎯 Dispatch — CallSid: ${callSid}  Touche: ${digit}  Motif: ${motif}`);
    await updateCall(callSid, { motif, rawDigits: digit });

    if (motif === 'humain') {
        // Transfert direct sans réponse intermédiaire
        res.type('text/xml');
        return res.send(buildRedirect(voiceUrl('human', { motif })));
    }

    // Pour tous les autres motifs → réponse vocale + sous-menu
    res.type('text/xml');
    res.send(buildRedirect(voiceUrl('answer', { motif })));
}

module.exports = { dispatch };
