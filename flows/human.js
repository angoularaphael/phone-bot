'use strict';

/**
 * Ancien transfert humain : plus aucun Dial.
 * On ramène l'appelant dans la conversation.
 */

const { buildVoiceGather, buildSay } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { updateCall } = require('../lib/tracker');
const { log } = require('../lib/logger');
const { HUMAN_STEER, CALLBACK_CONFIRM, GOODBYE } = require('../config/messages');

async function human(req, res) {
    const callSid = req.body.CallSid;
    log(`🗣️  Demande conseiller — CallSid: ${callSid} — redirection conversation (pas de transfert)`);
    if (callSid) {
        await updateCall(callSid, { notes: 'human_steered_to_converse', status: 'in_progress' });
    }
    res.type('text/xml');
    res.send(buildVoiceGather({
        say:     HUMAN_STEER,
        action:  voiceUrl('converse'),
        timeout: 8,
    }));
}

async function fallback(req, res) {
    const callSid = req.body.CallSid;
    log(`🗣️  Fallback — CallSid: ${callSid} — conversation, pas de Dial`);
    if (callSid) {
        await updateCall(callSid, { notes: 'no_transfer', status: 'in_progress' });
    }
    res.type('text/xml');
    res.send(buildVoiceGather({
        say:     HUMAN_STEER,
        action:  voiceUrl('converse'),
        timeout: 8,
    }));
}

async function recorded(req, res) {
    const callSid = req.body.CallSid;
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
