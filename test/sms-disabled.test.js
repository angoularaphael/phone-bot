'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendSms } = require('../lib/sms');
const { collectName, collectPhone, collectSave } = require('../flows/collect');

function mockRes() {
    const out = { xml: '', typeVal: '' };
    const res = {
        type(v) { out.typeVal = v; return res; },
        send(v) { out.xml = String(v); return res; },
    };
    return { res, out };
}

test('SMS public du bot téléphone est coupé', async () => {
    const out = await sendSms({ to: '+33612345678', body: 'hello' });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'sms_disabled');
    assert.equal(out.skipped, true);
});

test('SMS interne du menu 99 part en dry-run', async () => {
    const prev = process.env.BOT_DRY_RUN;
    process.env.BOT_DRY_RUN = 'true';
    try {
        const out = await sendSms({ to: '+33762641473', body: 'Q : test\nR : ok', internal: true });
        assert.equal(out.ok, true);
        assert.equal(out.sid, 'dry-run');
    } finally {
        if (prev === undefined) delete process.env.BOT_DRY_RUN;
        else process.env.BOT_DRY_RUN = prev;
    }
});

test('SMS interne refuse un numéro d appelant', async () => {
    const prev = process.env.BOT_DRY_RUN;
    process.env.BOT_DRY_RUN = 'true';
    try {
        const out = await sendSms({ to: '+33612345678', body: 'Q : test\nR : ok', internal: true });
        assert.equal(out.ok, false);
        assert.equal(out.error, 'sms_disabled');
    } finally {
        if (prev === undefined) delete process.env.BOT_DRY_RUN;
        else process.env.BOT_DRY_RUN = prev;
    }
});

test('collecte SMS appelant refuse sur name, phone et save', () => {
    const req = { body: { CallSid: 'CA_TEST' }, query: { motif: 'inscription' } };
    for (const handler of [collectName, collectPhone, collectSave]) {
        const { res, out } = mockRes();
        handler(req, res);
        assert.match(out.xml, /n'envoie plus de S\.M\.S/i);
        assert.doesNotMatch(out.xml, /collect\/save/);
    }
});
