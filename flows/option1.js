'use strict';

/**
 * Option 1 — Inscriptions / offres (jusqu'à ~2 min), SMS boutique, raccroche.
 */

const { buildGather, buildHangup } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { updateCall } = require('../lib/tracker');
const { log, warn } = require('../lib/logger');
const { sendSms } = require('../lib/sms');
const {
    OPTION1_OFFERS,
    OPTION1_ASK_SMS,
    OPTION1_SMS_YES,
    OPTION1_SMS_NO,
    SMS_FAILED,
    RATE_OFFERS,
    RATE_FAST,
} = require('../config/messages');

function boutiqueLink() {
    return process.env.LINK_BOUTIQUE || 'https://boutique.boxingcenter.fr/';
}

async function option1(req, res) {
    const phase = req.query.phase || 'pitch';
    const digit = String(req.body.Digits || '').trim();
    const callSid = req.body.CallSid;
    const caller = req.body.From || '';

    res.type('text/xml');

    if (phase === 'pitch') {
        return res.send(buildGather({
            say: `${OPTION1_OFFERS} ${OPTION1_ASK_SMS}`,
            action: voiceUrl('option1', { phase: 'sms' }),
            timeout: 10,
            rate: RATE_OFFERS,
            bargeIn: false,
        }));
    }

    if (digit === '1') {
        return finishWithSms(req, res, callSid, caller);
    }

    await updateCall(callSid, { status: 'completed' });
    return res.send(buildHangup(OPTION1_SMS_NO, RATE_OFFERS));
}

async function finishWithSms(req, res, callSid, caller) {
    const link = boutiqueLink();
    const body = `Boxing Center — inscrivez-vous ici : ${link}`;
    log(`Option1 SMS — CallSid: ${callSid} → ${caller}`);

    const result = await sendSms({ to: caller, body, allowPublic: true });
    if (result.ok) {
        await updateCall(callSid, { smsSent: true, status: 'completed', callerPhone: caller });
        return res.send(buildHangup(OPTION1_SMS_YES, RATE_OFFERS));
    }

    warn(`Option1 SMS echec: ${result.error}`);
    await updateCall(callSid, { status: 'completed' });
    return res.send(buildHangup(`${SMS_FAILED} ${OPTION1_SMS_NO}`, RATE_FAST));
}

module.exports = { option1 };
