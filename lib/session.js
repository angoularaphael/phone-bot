'use strict';

/**
 * Historique court d'appel, en mémoire, indexé par CallSid.
 * TTL : 45 minutes (un appel ne dure jamais autant).
 */

const TTL_MS = 45 * 60 * 1000;
const MAX_TURNS = 12;

const store = new Map();

function get(callSid) {
    if (!callSid) return { messages: [], misses: 0, lastGym: null, lastQuestion: '' };
    const row = store.get(callSid);
    if (!row) return { messages: [], misses: 0 };
    if (Date.now() - row.updatedAt > TTL_MS) {
        store.delete(callSid);
        return { messages: [], misses: 0 };
    }
    return row;
}

function touch(callSid, patch = {}) {
    if (!callSid) return get(callSid);
    const prev = get(callSid);
    const next = {
        ...prev,
        ...patch,
        updatedAt: Date.now(),
    };
    if (next.messages.length > MAX_TURNS * 2) {
        next.messages = next.messages.slice(-MAX_TURNS * 2);
    }
    store.set(callSid, next);
    return next;
}

function pushTurn(callSid, role, content) {
    const prev = get(callSid);
    const messages = [...(prev.messages || []), { role, content: String(content || '').slice(0, 800) }];
    return touch(callSid, { messages, misses: 0 });
}

function addMiss(callSid) {
    const prev = get(callSid);
    return touch(callSid, { misses: (prev.misses || 0) + 1 });
}

function resetMisses(callSid) {
    return touch(callSid, { misses: 0 });
}

function drop(callSid) {
    if (callSid) store.delete(callSid);
}

function historyForLlm(callSid) {
    return (get(callSid).messages || []).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
    }));
}

module.exports = { get, touch, pushTurn, addMiss, resetMisses, drop, historyForLlm };
