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
assert.match(brand, /phoneme alphabet="ipa"/);
assert.match(brand, /Boxing Center/);
assert.doesNotMatch(brand, /xml:lang="en-US"/);

console.log('ok — twiml provider telnyx/twilio');
