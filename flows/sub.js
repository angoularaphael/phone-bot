'use strict';

/**
 * Sous-menu après la réponse vocale.
 *
 * Digits reçus :
 *   1  → envoyer un SMS
 *   2  → envoyer sur WhatsApp
 *   3  → demander un rappel
 *   4  → parler à un conseiller (transfert)
 *   *  → retour menu principal
 *   timeout / autre → rejouer la réponse
 *
 * URL attendue : POST /voice/sub?motif=seance_essai
 */

const { buildRedirect, buildGather } = require('../lib/twiml');
const { voiceUrl }                   = require('../lib/url');
const { ANSWERS, SUB_MENU, NO_INPUT } = require('../config/messages');

function sub(req, res) {
    const digit = req.body.Digits;
    const motif = req.query.motif || 'autre';

    res.type('text/xml');

    switch (digit) {
        case '1':
            return res.send(buildRedirect(voiceUrl('collect/name', { motif })));

        case '2':
            return res.send(buildRedirect(voiceUrl('whatsapp/name', { motif })));

        case '3':
            return res.send(buildRedirect(voiceUrl('callback', { motif })));

        case '4':
            return res.send(buildRedirect(voiceUrl('human', { motif })));

        case '*':
            return res.send(buildRedirect(voiceUrl('menu')));

        default: {
            const answerText = ANSWERS[motif] || ANSWERS.autre;
            const fullText   = `${NO_INPUT}${answerText} ${SUB_MENU}`;
            return res.send(buildGather({
                say:       fullText,
                action:    voiceUrl('sub', { motif }),
                numDigits: 1,
                timeout:   12,
            }));
        }
    }
}

module.exports = { sub };
