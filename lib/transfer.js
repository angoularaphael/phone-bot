'use strict';

const { routes } = require('../config/routing');

/**
 * Retourne le numéro de transfert pour un motif donné.
 * Cherche d'abord le numéro spécifique au motif, puis le numéro d'accueil général.
 */
function getTransferNumber(motif) {
    const all   = routes();
    const route = all[motif];
    return route?.transfer || process.env.TRANSFER_ACCUEIL || null;
}

/**
 * Indique si un transfert vers un humain est possible.
 */
function canTransfer(motif) {
    return !!getTransferNumber(motif);
}

module.exports = { getTransferNumber, canTransfer };
