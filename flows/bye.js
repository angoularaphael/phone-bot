'use strict';

/**
 * Au revoir — message de fin + raccrochage.
 * Appelé si l'appelant ne fait rien après l'outro.
 */

const { buildHangup }  = require('../lib/twiml');
const { updateCall }   = require('../lib/tracker');
const { drop }         = require('../lib/session');
const { GOODBYE }      = require('../config/messages');

async function bye(req, res) {
    const callSid = req.body.CallSid;
    if (callSid) {
        await updateCall(callSid, { status: 'completed' });
        drop(callSid);
    }

    res.type('text/xml');
    res.send(buildHangup(GOODBYE));
}

module.exports = { bye };
