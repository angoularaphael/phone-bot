'use strict';

function encodeState(obj) {
    return Buffer.from(JSON.stringify(obj || {})).toString('base64');
}

function decodeState(raw) {
    if (!raw) return {};
    try {
        return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
        return {};
    }
}

module.exports = { encodeState, decodeState };
