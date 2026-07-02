'use strict';

/**
 * Accueil de l'appel entrant.
 * Joue le message de bienvenue + le menu principal.
 * Enregistre l'appel dans Supabase.
 */

const { buildGather }   = require('../lib/twiml');
const { saveCall }      = require('../lib/tracker');
const { voiceUrl }      = require('../lib/url');
const { log }           = require('../lib/logger');
const { WELCOME, MENU } = require('../config/messages');

async function welcome(req, res) {
    const callSid = req.body.CallSid;
    const caller  = req.body.From  || 'unknown';
    const called  = req.body.To    || process.env.TWILIO_PHONE_NUMBER || '';

    log(`📞 Appel entrant — CallSid: ${callSid}  De: ${caller}  Vers: ${called}`);

    await saveCall({ callSid, caller, called, status: 'in_progress' });

    const twiml = buildGather({
        say:       WELCOME + MENU,
        action:    voiceUrl('dispatch'),
        numDigits: 1,
        timeout:   12,
    });

    res.type('text/xml');
    res.send(twiml);
}

module.exports = { welcome };
