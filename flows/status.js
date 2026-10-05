'use strict';

/**
 * Callback de statut voix (StatusCallback).
 * POST en fin d'appel avec :
 *   CallSid, CallStatus, CallDuration (secondes)
 *
 * À configurer dans Telnyx TeXML App ou Twilio Console :
 *   https://votre-serveur.com/voice/status
 */

const { updateCall } = require('../lib/tracker');
const { drop }       = require('../lib/session');
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
        if (status === 'completed' || status === 'busy' || status === 'failed' || status === 'no-answer' || status === 'canceled') {
            drop(callSid);
            try {
                require('./converse').clearThinkingJob(callSid);
            } catch (_) { /* ignore */ }
        }
    }

    res.sendStatus(204);
}

module.exports = { statusCallback };
