'use strict';

/**
 * Callback de statut Twilio (StatusCallback).
 * Twilio POST vers cette URL en fin d'appel avec :
 *   CallSid, CallStatus, CallDuration (secondes)
 *
 * À configurer dans Twilio Console → Phone Numbers → Voice → Status Callback URL :
 *   https://votre-serveur.com/voice/status
 */

const { updateCall } = require('../lib/tracker');
const { log }        = require('../lib/logger');

async function statusCallback(req, res) {
    const callSid = req.body.CallSid;
    const status  = req.body.CallStatus;
    const duration = parseInt(req.body.CallDuration || '0', 10);

    log(`📊 Status — CallSid: ${callSid}  Status: ${status}  Durée: ${duration}s`);

    if (callSid) {
        await updateCall(callSid, {
            status:      status === 'completed' ? 'completed' : status,
            durationSec: duration || null,
        });
    }

    res.sendStatus(204);
}

module.exports = { statusCallback };
