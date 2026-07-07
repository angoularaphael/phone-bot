'use strict';

/**
 * Lecture de la réponse vocale pour un motif donné
 * puis affichage du sous-menu (SMS / rappel / humain / retour).
 *
 * URL attendue : POST /voice/answer?motif=seance_essai
 */

const { buildGather }            = require('../lib/twiml');
const { voiceUrl }               = require('../lib/url');
const { getAnswer, SUB_MENU }      = require('../config/messages');

function answer(req, res) {
    const motif = req.query.motif || 'autre';

    const answerText = getAnswer(motif);
    const fullText   = `${answerText} ${SUB_MENU}`;

    const twiml = buildGather({
        say:       fullText,
        action:    voiceUrl('sub', { motif }),
        numDigits: 1,
        timeout:   12,
    });

    res.type('text/xml');
    res.send(twiml);
}

module.exports = { answer };
