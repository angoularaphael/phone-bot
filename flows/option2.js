'use strict';

/**
 * Option 2 — Activités / plannings : redirige site, SMS optionnel, raccroche.
 * Pas de détail oral des plannings.
 */

const { buildGather, buildHangup } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { updateCall } = require('../lib/tracker');
const { log, warn } = require('../lib/logger');
const { sendSms } = require('../lib/sms');
const {
    OPTION2_BODY,
    OPTION2_SMS_YES,
    OPTION2_SMS_NO,
    SMS_FAILED,
    RATE_FAST,
} = require('../config/messages');

function siteLink() {
    return process.env.LINK_SITE || process.env.BOXING_WEBSITE || 'https://www.boxingcenter.fr/';
}

async function option2(req, res) {
    const phase = req.query.phase || 'ask';
    const digit = String(req.body.Digits || '').trim();
    const callSid = req.body.CallSid;
    const caller = req.body.From || '';

    res.type('text/xml');

    if (phase === 'ask') {
        return res.send(buildGather({
            say: OPTION2_BODY,
            action: voiceUrl('option2', { phase: 'sms' }),
            timeout: 6,
            rate: RATE_FAST,
        }));
    }

    if (digit === '1') {
        return finishWithSms(req, res, callSid, caller);
    }

    await updateCall(callSid, { status: 'completed' });
    return res.send(buildHangup(OPTION2_SMS_NO, RATE_FAST));
}

async function finishWithSms(req, res, callSid, caller) {
    const link = siteLink();
    const body = `Boxing Center — activites et plannings : ${link}`;
    log(`Option2 SMS — CallSid: ${callSid} → ${caller}`);

    const result = await sendSms({ to: caller, body, allowPublic: true });
    if (result.ok) {
        await updateCall(callSid, { smsSent: true, status: 'completed', callerPhone: caller });
        return res.send(buildHangup(OPTION2_SMS_YES, RATE_FAST));
    }

    warn(`Option2 SMS echec: ${result.error}`);
    await updateCall(callSid, { status: 'completed' });
    return res.send(buildHangup(`${SMS_FAILED} ${OPTION2_SMS_NO}`, RATE_FAST));
}

module.exports = { option2 };
