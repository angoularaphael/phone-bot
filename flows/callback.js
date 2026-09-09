'use strict';

/**
 * Enregistrement d'une demande de rappel.
 * Sauvegarde le statut dans Supabase et confirme à l'appelant.
 *
 * URL attendue : POST /voice/callback?motif=...
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }         = require('../lib/url');
const { updateCall }       = require('../lib/tracker');
const { log }              = require('../lib/logger');
const session = require('../lib/session');
const { CALLBACK_CONFIRM, getFollowUp } = require('../config/messages');

async function callback(req, res) {
    const motif   = req.query.motif || 'autre';
    const callSid = req.body.CallSid;
    const caller  = req.body.From || '';

    log(`📞 Demande de rappel — CallSid: ${callSid}  De: ${caller}  Motif: ${motif}`);

    await updateCall(callSid, {
        callbackRequested: true,
        status:            'callback_requested',
    });

    const smsSent = !!session.get(callSid).smsSent;
    const twiml = buildVoiceGather({
        say:     CALLBACK_CONFIRM + ' ' + getFollowUp({ motif, smsSent }),
        action:  voiceUrl('sub', { motif }),
        timeout: 10,
    });

    res.type('text/xml');
    res.send(twiml);
}

module.exports = { callback };
