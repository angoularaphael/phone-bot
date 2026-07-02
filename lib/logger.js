'use strict';

function now() {
    return new Date().toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    });
}

function log(msg)  { console.log(`[${now()}] ${msg}`); }
function warn(msg) { console.warn(`[${now()}] ⚠️  ${msg}`); }
function err(msg)  { console.error(`[${now()}] ❌ ${msg}`); }

module.exports = { log, warn, err };
