'use strict';

/**
 * Enregistrement d'une demande de rappel.
 * Sauvegarde le statut dans Supabase et confirme à l'appelant.
 *
 * URL attendue : POST /voice/callback?motif=...
 */

const { buildGather }      = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { updateCall }       = require('../lib/tracker');
const { log }              = require('../lib/logger');
const { CALLBACK_CONFIRM, OUTRO } = require('../config/messages');

async function callback(req, res) {
    const motif   = req.query.motif || 'autre';
    const callSid = req.body.CallSid;
    const caller  = req.body.From || '';

    log(`📞 Demande de rappel — CallSid: ${callSid}  De: ${caller}  Motif: ${motif}`);

    await updateCall(callSid, {
        callbackRequested: true,
        status:            'callback_requested',
    });

    const twiml = buildGather({
        say:       CALLBACK_CONFIRM + ' ' + OUTRO,
        action:    voiceUrl('dispatch'),
        numDigits: 1,
        timeout:   8,
    });

    res.type('text/xml');
    res.send(twiml);
}

module.exports = { callback };
