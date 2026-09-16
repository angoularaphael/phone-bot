'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendSms } = require('../lib/sms');

test('Twilio SMS du bot téléphone est coupé', async () => {
    const out = await sendSms({ to: '+33612345678', body: 'hello' });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'sms_disabled');
    assert.equal(out.skipped, true);
});
