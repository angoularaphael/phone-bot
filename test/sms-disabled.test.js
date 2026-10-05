'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.BOT_DRY_RUN = 'true';
process.env.TWILIO_ACCOUNT_SID = 'ACtest';
process.env.TWILIO_AUTH_TOKEN = 'token';
process.env.TWILIO_PHONE_NUMBER = '+33939036748';

const { sendSms, smsPayload } = require('../lib/sms');

test('SMS sans allowPublic reste coupe', async () => {
    const out = await sendSms({ to: '+33612345678', body: 'hello' });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'sms_disabled');
});

test('SMS option 1/2 autorise allowPublic', async () => {
    const out = await sendSms({ to: '+33612345678', body: 'boutique', allowPublic: true });
    assert.equal(out.ok, true);
    assert.equal(out.sid, 'dry-run');
});

test('SMS interne inbox 99 autorise', async () => {
    const out = await sendSms({ to: '+33762641473', body: 'Q : test\nR : ok', internal: true });
    assert.equal(out.ok, true);
});

test('SMS interne hors inbox refuse', async () => {
    const out = await sendSms({ to: '+33612345678', body: 'Q : test\nR : ok', internal: true });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'sms_disabled');
});

test('SMS France part en alphanumerique BoxingCtr', () => {
    process.env.TWILIO_SMS_FROM = '';
    const payload = smsPayload('+33612345678', 'Boxing Center: inscrivez-vous ici https://boutique.boxingcenter.fr');
    assert.equal(payload.from, 'BoxingCtr');
    assert.equal(payload.to, '+33612345678');
    assert.match(payload.body, /boutique\.boxingcenter\.fr/);
});
