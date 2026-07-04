'use strict';

/**
 * Transfert de l'appel vers un conseiller humain.
 *
 * Si le numéro de transfert est configuré → <Dial>
 * Sinon → proposition de laisser un message vocal (enregistrement)
 *
 * URL : POST /voice/human?motif=...
 * URL fallback (appel non décroché) : POST /voice/fallback?motif=...
 */

const { buildTransfer, buildRecord, buildSay, buildGather } = require('../lib/twiml');
const { voiceUrl }                = require('../lib/url');
const { getTransferNumber }       = require('../lib/transfer');
const { updateCall }              = require('../lib/tracker');
const { log }                     = require('../lib/logger');
const {
    TRANSFER_WAIT,
    TRANSFER_FAILED,
    CALLBACK_CONFIRM,
    OUTRO,
    GOODBYE,
} = require('../config/messages');

async function human(req, res) {
    const motif    = req.query.motif || 'autre';
    const callSid  = req.body.CallSid;
    const number   = getTransferNumber(motif);

    log(`👤 Transfert demandé — CallSid: ${callSid}  Motif: ${motif}  Vers: ${number || '(aucun)'}`);

    res.type('text/xml');

    if (!number) {
        // Pas de numéro configuré → répondeur
        await updateCall(callSid, { status: 'callback_requested', callbackRequested: true });
        return res.send(buildRecord({
            say:    TRANSFER_FAILED,
            action: voiceUrl('recorded', { motif }),
            maxLength: 60,
        }));
    }

    await updateCall(callSid, {
        transferredTo: number,
        status:        'transferred',
    });

    return res.send(buildTransfer({
        number,
        sayBefore:   TRANSFER_WAIT,
        fallbackUrl: voiceUrl('fallback', { motif }),
    }));
}

/**
 * Fallback : le conseiller n'a pas décroché.
 */
async function fallback(req, res) {
    const motif   = req.query.motif || 'autre';
    const callSid = req.body.CallSid;

    log(`⚠️  Transfert non répondu — CallSid: ${callSid}  Motif: ${motif}`);

    await updateCall(callSid, {
        status:            'callback_requested',
        callbackRequested: true,
        notes:             'transfer_not_answered',
    });

    res.type('text/xml');
    res.send(buildGather({
        say:       TRANSFER_FAILED + ' ' + CALLBACK_CONFIRM + ' ' + OUTRO,
        action:    voiceUrl('dispatch'),
        numDigits: 1,
        timeout:   8,
    }));
}

/**
 * Confirmation après enregistrement d'un message vocal.
 */
async function recorded(req, res) {
    const callSid     = req.body.CallSid;
    const recordingUrl = req.body.RecordingUrl || null;

    await updateCall(callSid, {
        status:            'callback_requested',
        callbackRequested: true,
        recordingUrl,
    });

    log(`🎙️  Message enregistré — CallSid: ${callSid}`);

    res.type('text/xml');
    res.send(buildSay(CALLBACK_CONFIRM + ' ' + GOODBYE));
}

module.exports = { human, fallback, recorded };
