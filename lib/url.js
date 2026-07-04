'use strict';

/**
 * Construit les URLs des webhooks Twilio à partir de BASE_URL.
 * Exemple : voiceUrl('dispatch') → https://mon-serveur.com/voice/dispatch
 */
function voiceUrl(path, params = {}) {
    const base  = (process.env.BASE_URL || '').replace(/\/$/, '');
    const query = Object.keys(params).length > 0
        ? '?' + new URLSearchParams(params).toString()
        : '';
    return `${base}/voice/${path}${query}`;
}

module.exports = { voiceUrl };
