'use strict';

const assert = require('assert');
const path = require('path');

process.chdir(path.join(__dirname, '..'));
process.env.BOT_DRY_RUN = 'true';
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACtest';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'token';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+33939036748';
process.env.BASE_URL = 'https://example.com';

const { WELCOME, OPTION3_BODY, OPTION1_OFFERS, OPTION2_BODY } = require('../config/messages');
const { getMotifByDigit } = require('../config/routing');
const { sendSms } = require('../lib/sms');
const { registerCall, isBlocked, normalizeCaller } = require('../lib/rate-limit');

assert.match(WELCOME, /tapez 1/i);
assert.match(WELCOME, /tapez 2/i);
assert.match(WELCOME, /tapez 3/i);
assert.doesNotMatch(WELCOME, /tapez 4/i);
assert.equal(getMotifByDigit('1'), 'inscription');
assert.equal(getMotifByDigit('2'), 'planning');
assert.equal(getMotifByDigit('3'), 'administratif');
assert.equal(getMotifByDigit('4'), null);
assert.ok(OPTION1_OFFERS.length > 40);
assert.match(OPTION2_BODY, /boxingcenter\.fr/i);
assert.match(OPTION3_BODY, /Gérer mon abonnement/i);

(async () => {
    const blockedPublic = await sendSms({ to: '+33612345678', body: 'x' });
    assert.equal(blockedPublic.error, 'sms_disabled');

    const allowed = await sendSms({ to: '+33612345678', body: 'lien boutique', allowPublic: true });
    assert.equal(allowed.ok, true);
    assert.equal(allowed.sid, 'dry-run');

    const caller = normalizeCaller('+33699887766');
    assert.equal(caller, '+33699887766');

    // reset mem by using unique number
    const n = `+336${String(Date.now()).slice(-8)}`;
    let r = await registerCall(n);
    assert.equal(r.blocked, false);
    r = await registerCall(n);
    assert.equal(r.blocked, false);
    r = await registerCall(n);
    assert.equal(r.blocked, false); // 3e appel encore autorise
    r = await registerCall(n);
    assert.equal(r.blocked, true); // 4e = bloque
    const b = await isBlocked(n);
    assert.equal(b.blocked, true);

    console.log('ok — coach brief (messages, SMS, anti-abus)');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
