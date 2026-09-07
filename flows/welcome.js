'use strict';

/**
 * Accueil David — menu 4 touches.
 */

const { buildVoiceGather } = require('../lib/twiml');
const { saveCall }         = require('../lib/tracker');
const { voiceUrl }         = require('../lib/url');
const { log }              = require('../lib/logger');
const { WELCOME }          = require('../config/messages');

async function welcome(req, res) {
    const callSid = req.body.CallSid;
    const caller  = req.body.From  || 'unknown';
    const called  = req.body.To    || process.env.TWILIO_PHONE_NUMBER || '';

    log(`📞 Appel entrant — CallSid: ${callSid}  De: ${caller}  Vers: ${called}`);

    await saveCall({ callSid, caller, called, status: 'in_progress' });

    const twiml = buildVoiceGather({
        say:     WELCOME,
        action:  voiceUrl('dispatch'),
        timeout: 6,
    });

    res.type('text/xml');
    res.send(twiml);
}

module.exports = { welcome };
