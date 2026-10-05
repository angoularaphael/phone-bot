'use strict';

/**
 * Conversation libre désactivée — raccroche vers les supports web.
 */

const { buildHangup } = require('../lib/twiml');
const { RATE_FAST } = require('../config/messages');

function clearThinkingJob() { /* no-op compat status.js */ }

async function converse(req, res) {
    res.type('text/xml');
    res.send(buildHangup(
        `Merci. Pour les offres, consultez la boutique Boxing Center. ` +
        `Pour les plannings, allez sur boxingcenter.fr. ` +
        `Pour gérer votre abonnement, utilisez la page Gérer mon abonnement. Au revoir.`,
        RATE_FAST
    ));
}

module.exports = { converse, clearThinkingJob };
