'use strict';

const assert = require('assert');
const path = require('path');

process.chdir(path.join(__dirname, '..'));

function loadTwiml(provider) {
    delete require.cache[require.resolve('../lib/provider')];
    delete require.cache[require.resolve('../lib/twiml')];
    process.env.VOICE_PROVIDER = provider;
    return require('../lib/twiml');
}

const twilioXml = loadTwiml('twilio').buildVoiceGather({
    say: 'Test',
    action: 'https://example.com/voice/dispatch',
});
assert.match(twilioXml, /input="speech dtmf"/);
assert.match(twilioXml, /speechModel="phone_call"/);
assert.doesNotMatch(twilioXml, /transcriptionEngine/);

const telnyxXml = loadTwiml('telnyx').buildVoiceGather({
    say: 'Test',
    action: 'https://example.com/voice/dispatch',
});
assert.match(telnyxXml, /input="dtmf speech"/);
assert.match(telnyxXml, /transcriptionEngine="Deepgram"/);
assert.match(telnyxXml, /model="deepgram\/nova-2"/);

const brand = loadTwiml('twilio').buildHangup('Je suis David de Boxing Center.');
assert.match(brand, /<sub alias="Bokcing ceinteur">Boxing Center<\/sub>/);
assert.doesNotMatch(brand, /&lt;sub/);
assert.doesNotMatch(brand, /&lt;speak/);

const { OPTION2_BODY, WELCOME, OPTION2_SMS_NO, BLOCKED_MSG } = require('../config/messages');
const option2 = loadTwiml('twilio').buildGather({
    say: OPTION2_BODY,
    action: 'https://example.com/voice/option2',
});
assert.match(option2, /<sub alias="Bokcing ceinteur">Boxing Center<\/sub>/);
assert.match(option2, /<sub alias="Bokcing ceinteur point F R">boxingcenter.fr<\/sub>/);
assert.doesNotMatch(option2, /&lt;sub/);

const welcome = loadTwiml('twilio').buildHangup(WELCOME);
assert.match(welcome, /<sub alias="Bokcing ceinteur">Boxing Center<\/sub>/);

const noSms = loadTwiml('twilio').buildHangup(OPTION2_SMS_NO);
assert.match(noSms, /<sub alias="Bokcing ceinteur point F R">boxingcenter.fr<\/sub>/);

const blocked = loadTwiml('twilio').buildHangup(BLOCKED_MSG);
assert.match(blocked, /<sub alias="Bokcing ceinteur">Boxing Center<\/sub>/);
assert.match(blocked, /<sub alias="Bokcing ceinteur point F R">boxingcenter.fr<\/sub>/);

console.log('ok — twiml provider telnyx/twilio');
