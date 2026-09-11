'use strict';

/**
 * Mode interne 99 — pas annoncé au menu.
 * 1 : poser la question · 2 : enregistrer la réponse → SMS Q / R.
 */

const {
    buildGather,
    buildSilentGather,
    buildSpeechGather,
    buildRedirect,
} = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { speechOrDigit } = require('../lib/speech');
const session = require('../lib/session');
const { log } = require('../lib/logger');
const { sendTrainPair } = require('../lib/train-qa');
const {
    TRAIN_HUB,
    TRAIN_ASK_Q,
    TRAIN_ASK_R,
    TRAIN_NEED_Q,
    TRAIN_Q_OK,
    TRAIN_SMS_OK,
    TRAIN_SMS_FAIL,
    TRAIN_MISS,
} = require('../config/messages');

function hubTwiml(say = TRAIN_HUB) {
    return buildGather({
        say,
        action: voiceUrl('train/hub'),
        numDigits: 1,
        timeout: 8,
    });
}

function captureTwiml(kind) {
    return buildSpeechGather({
        say: kind === 'r' ? TRAIN_ASK_R : TRAIN_ASK_Q,
        action: voiceUrl('train/capture', { kind }),
        timeout: 12,
        speechTimeout: 3,
    });
}

function tryOpenTrain(digit, res) {
    if (digit === '99') {
        res.send(hubTwiml());
        return true;
    }
    if (digit === '9') {
        res.send(buildSilentGather({
            action: voiceUrl('train/gate'),
            numDigits: 1,
            timeout: 4,
        }));
        return true;
    }
    return false;
}

function trainGate(req, res) {
    const { digit } = speechOrDigit(req);
    res.type('text/xml');
    if (digit === '9' || digit === '99') {
        log(`🧠 Train — CallSid: ${req.body.CallSid}  mode ouvert`);
        return res.send(hubTwiml());
    }
    return res.send(buildRedirect(voiceUrl('menu')));
}

async function trainHub(req, res) {
    const { digit } = speechOrDigit(req);
    const callSid = req.body.CallSid;
    const sess = session.get(callSid);

    res.type('text/xml');

    if (digit === '*' || digit === '0') {
        return res.send(buildRedirect(voiceUrl('menu')));
    }
    if (digit === '1') {
        return res.send(captureTwiml('q'));
    }
    if (digit === '2') {
        if (!sess.trainQ) {
            return res.send(hubTwiml(TRAIN_NEED_Q));
        }
        return res.send(captureTwiml('r'));
    }
    if (digit === '3' && sess.trainQ && sess.trainR) {
        return sendAndConfirm(req, res);
    }

    return res.send(hubTwiml());
}

async function trainCapture(req, res) {
    const kind = req.query.kind === 'r' ? 'r' : 'q';
    const speech = String(req.body.SpeechResult || '').trim();
    const callSid = req.body.CallSid;

    res.type('text/xml');

    if (!speech) {
        return res.send(hubTwiml(`${TRAIN_MISS}${kind === 'r' ? TRAIN_ASK_R : TRAIN_ASK_Q}`));
    }

    if (kind === 'q') {
        session.touch(callSid, { trainQ: speech, trainR: '' });
        log(`🧠 Train Q — CallSid: ${callSid}  « ${speech.slice(0, 80)} »`);
        return res.send(hubTwiml(TRAIN_Q_OK));
    }

    session.touch(callSid, { trainR: speech });
    log(`🧠 Train R — CallSid: ${callSid}  « ${speech.slice(0, 80)} »`);
    return sendAndConfirm(req, res);
}

async function sendAndConfirm(req, res) {
    const callSid = req.body.CallSid;
    const sess = session.get(callSid);
    const caller = req.body.From || '';

    res.type('text/xml');

    if (!sess.trainQ || !sess.trainR) {
        return res.send(hubTwiml(sess.trainQ ? TRAIN_Q_OK : TRAIN_NEED_Q));
    }

    const result = await sendTrainPair({
        q: sess.trainQ,
        r: sess.trainR,
        from: caller,
        callSid,
    });

    if (result.ok) session.touch(callSid, { trainQ: '', trainR: '' });
    return res.send(hubTwiml(result.ok ? TRAIN_SMS_OK : TRAIN_SMS_FAIL));
}

module.exports = {
    tryOpenTrain,
    trainGate,
    trainHub,
    trainCapture,
    sendAndConfirm,
};
