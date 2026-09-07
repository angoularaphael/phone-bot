'use strict';

/**
 * Transfert humain désactivé : le bot répond lui-même.
 * Les variables TRANSFER_* restent dans le .env mais ne sont plus lues.
 */

function getTransferNumber() {
    return null;
}

function canTransfer() {
    return false;
}

module.exports = { getTransferNumber, canTransfer };
