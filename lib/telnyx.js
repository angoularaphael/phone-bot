'use strict';

/**
 * Client API Telnyx — Call Control v2 + SMS.
 */

const { warn } = require('./logger');

const API_BASE = 'https://api.telnyx.com/v2';

function apiKey() {
    return process.env.TELNYX_API_KEY || '';
}

function fromNumber() {
    return process.env.TELNYX_PHONE_NUMBER || '';
}

function voice() {
    return process.env.BOT_VOICE || 'Azure.fr-FR-DeniseNeural';
}

function language() {
    return process.env.BOT_LANGUAGE || 'fr-FR';
}

function isConfigured() {
    return !!(apiKey() && fromNumber());
}

async function api(method, path, body) {
    const key = apiKey();
    if (!key) throw new Error('TELNYX_API_KEY manquant');

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            Authorization:  `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Telnyx ${res.status}: ${txt}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

async function answer(callControlId, clientState) {
    return api('POST', `/calls/${callControlId}/actions/answer`, {
        client_state: clientState || undefined,
    });
}

async function gatherSpeak(callControlId, { text, max = 1, timeoutMs = 12000, clientState, validDigits = '123456789*0' }) {
    return api('POST', `/calls/${callControlId}/actions/gather_using_speak`, {
        payload:                    text,
        payload_type:               'text',
        voice:                      voice(),
        language:                   language(),
        maximum_digits:             max,
        valid_digits:               validDigits,
        timeout_millis:             timeoutMs,
        inter_digit_timeout_millis: 3000,
        client_state:               clientState || undefined,
    });
}

async function speak(callControlId, text, clientState) {
    return api('POST', `/calls/${callControlId}/actions/speak`, {
        payload:      text,
        payload_type: 'text',
        voice:        voice(),
        language:     language(),
        client_state: clientState || undefined,
    });
}

async function hangup(callControlId) {
    return api('POST', `/calls/${callControlId}/actions/hangup`, {});
}

async function transfer(callControlId, to, clientState) {
    return api('POST', `/calls/${callControlId}/actions/transfer`, {
        to,
        from:         fromNumber() || undefined,
        client_state: clientState || undefined,
    });
}

async function sendSms({ to, text }) {
    return api('POST', '/messages', {
        from: fromNumber(),
        to,
        text,
    });
}

async function verify() {
    if (!apiKey()) return { ok: false, error: 'TELNYX_API_KEY manquant' };
    if (!fromNumber()) return { ok: false, error: 'TELNYX_PHONE_NUMBER manquant' };

    try {
        await api('GET', '/phone_numbers?page[size]=1');
        return { ok: true, phone: fromNumber() };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

module.exports = {
    answer,
    gatherSpeak,
    speak,
    hangup,
    transfer,
    sendSms,
    verify,
    isConfigured,
    fromNumber,
};
