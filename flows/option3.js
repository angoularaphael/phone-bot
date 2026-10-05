'use strict';

/**
 * Option 3 — Gestion / résiliation : message court, aucun SMS, raccroche.
 */

const { buildHangup } = require('../lib/twiml');
const { updateCall } = require('../lib/tracker');
const { OPTION3_BODY, RATE_FAST } = require('../config/messages');

async function option3(req, res) {
    const callSid = req.body.CallSid;
    await updateCall(callSid, { motif: 'administratif', status: 'completed' });
    res.type('text/xml');
    res.send(buildHangup(OPTION3_BODY, RATE_FAST));
}

module.exports = { option3 };
