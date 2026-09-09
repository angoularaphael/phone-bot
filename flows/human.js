'use strict';

/**
 * Ancien transfert humain : plus aucun Dial.
 * On ramène l'appelant au menu David.
 */

const { buildVoiceGather, buildSay } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { updateCall } = require('../lib/tracker');
const { log } = require('../lib/logger');
const { HUMAN_STEER, GOODBYE } = require('../config/messages');

async function human(req, res) {
    const callSid = req.body.CallSid;
    log(`🗣️  Demande conseiller — CallSid: ${callSid} — redirection menu (pas de transfert)`);
    if (callSid) {
        await updateCall(callSid, { notes: 'human_steered_to_menu', status: 'in_progress' });
    }
    res.type('text/xml');
    res.send(buildVoiceGather({
        say:     HUMAN_STEER,
        action:  voiceUrl('dispatch'),
        timeout: 10,
    }));
}

async function fallback(req, res) {
    const callSid = req.body.CallSid;
    log(`🗣️  Fallback — CallSid: ${callSid} — menu, pas de Dial`);
    if (callSid) {
        await updateCall(callSid, { notes: 'no_transfer', status: 'in_progress' });
    }
    res.type('text/xml');
    res.send(buildVoiceGather({
        say:     HUMAN_STEER,
        action:  voiceUrl('dispatch'),
        timeout: 10,
    }));
}

async function recorded(req, res) {
    const callSid = req.body.CallSid;
    const recordingUrl = req.body.RecordingUrl || null;
    await updateCall(callSid, {
        status:            'completed',
        recordingUrl,
    });
    log(`🎙️  Message enregistré — CallSid: ${callSid}`);
    res.type('text/xml');
    res.send(buildSay(GOODBYE));
}

module.exports = { human, fallback, recorded };
