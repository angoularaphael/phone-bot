'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendSms, isConfigured } = require('../lib/sms');

test('aucun SMS Twilio ne part, même avec un numéro', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_PHONE_NUMBER = '+33900000000';
    assert.equal(isConfigured(), false);
    const out = await sendSms({ to: '+33612345678', body: 'hello' });
    assert.equal(out.ok, false);
    assert.equal(out.skipped, true);
    assert.equal(out.error, 'sms_disabled');
});
