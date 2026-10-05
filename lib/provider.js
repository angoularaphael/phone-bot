'use strict';

/**
 * Fournisseur voix : telnyx (cible) ou twilio (secours).
 * SMS interne (menu 99) reste sur Twilio tant que non migré.
 */

function voiceProvider() {
    const raw = String(process.env.VOICE_PROVIDER || 'twilio').trim().toLowerCase();
    return raw === 'telnyx' ? 'telnyx' : 'twilio';
}

function isTelnyx() {
    return voiceProvider() === 'telnyx';
}

function voicePhoneNumber() {
    if (isTelnyx()) {
        return (
            process.env.TELNYX_PHONE_NUMBER ||
            process.env.VOICE_PHONE_NUMBER ||
            process.env.TWILIO_PHONE_NUMBER ||
            ''
        );
    }
    return process.env.TWILIO_PHONE_NUMBER || process.env.VOICE_PHONE_NUMBER || '';
}

function telnyxConfigured() {
    return Boolean(process.env.TELNYX_API_KEY && voicePhoneNumber());
}

function twilioConfigured() {
    return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_PHONE_NUMBER
    );
}

module.exports = {
    voiceProvider,
    isTelnyx,
    voicePhoneNumber,
    telnyxConfigured,
    twilioConfigured,
};
