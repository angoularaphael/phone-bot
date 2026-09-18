'use strict';

/**
 * Ancienne collecte SMS pour l'appelant : plus d'envoi, quel que soit le menu.
 * Les routes restent pour d'éventuels webhooks Twilio déjà configurés.
 * Le menu interne 99 envoie toujours via lib/train-qa.js.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { voiceUrl }    = require('../lib/url');
const { resolveSmsMotif } = require('../lib/sms');
const { getFollowUp } = require('../config/messages');
const session = require('../lib/session');

function refuseSms(req, res) {
    const callSid = req.body.CallSid;
    const sess = session.get(callSid);
    const motif = resolveSmsMotif(sess.lastMotif || req.query.motif || 'autre', sess);

    return res.type('text/xml').send(buildVoiceGather({
        say: `Je n'envoie plus de S.M.S. ${getFollowUp({ motif, smsSent: false })}`,
        action: voiceUrl('sub', { motif }),
        timeout: 6,
    }));
}

function collectName(req, res) {
    return refuseSms(req, res);
}

function collectPhone(req, res) {
    return refuseSms(req, res);
}

function collectSave(req, res) {
    return refuseSms(req, res);
}

module.exports = { collectName, collectPhone, collectSave };
