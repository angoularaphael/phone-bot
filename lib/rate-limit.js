'use strict';

/**
 * Anti-abus : 3 appels en moins de 30 min → blocage 24 h.
 * Mémoire process + optionnel Supabase (table phone_blocks).
 */

const { createClient } = require('@supabase/supabase-js');
const { log, warn } = require('./logger');

const WINDOW_MS = parseInt(process.env.CALL_ABUSE_WINDOW_MS || String(30 * 60 * 1000), 10);
const MAX_CALLS = parseInt(process.env.CALL_ABUSE_MAX || '3', 10);
const BLOCK_MS = parseInt(process.env.CALL_ABUSE_BLOCK_MS || String(24 * 60 * 60 * 1000), 10);

/** @type {Map<string, { times: number[], blockedUntil: number }>} */
const mem = new Map();

function normalizeCaller(raw) {
    if (!raw || raw === 'unknown' || raw === 'anonymous') return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length < 8) return '';
    if (digits.length === 9) return `+33${digits}`;
    if (digits.length === 10 && digits.startsWith('0')) return `+33${digits.slice(1)}`;
    if (digits.startsWith('33')) return `+${digits}`;
    return String(raw).startsWith('+') ? String(raw) : `+${digits}`;
}

function getDb() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

function memEntry(caller) {
    let row = mem.get(caller);
    if (!row) {
        row = { times: [], blockedUntil: 0 };
        mem.set(caller, row);
    }
    return row;
}

async function isBlocked(callerRaw) {
    const caller = normalizeCaller(callerRaw);
    if (!caller) return { blocked: false, caller: '' };

    const now = Date.now();
    const row = memEntry(caller);
    if (row.blockedUntil > now) {
        return { blocked: true, caller, until: row.blockedUntil };
    }

    const db = getDb();
    if (db) {
        try {
            const { data, error } = await db
                .from('phone_blocks')
                .select('blocked_until')
                .eq('caller', caller)
                .maybeSingle();
            if (!error && data?.blocked_until) {
                const until = new Date(data.blocked_until).getTime();
                if (until > now) {
                    row.blockedUntil = until;
                    return { blocked: true, caller, until };
                }
            }
        } catch (e) {
            warn(`rate-limit isBlocked: ${e.message}`);
        }
    }

    return { blocked: false, caller };
}

async function registerCall(callerRaw) {
    const caller = normalizeCaller(callerRaw);
    if (!caller) return { blocked: false, caller: '', count: 0 };

    const now = Date.now();
    const existing = await isBlocked(caller);
    if (existing.blocked) return { ...existing, count: MAX_CALLS };

    const row = memEntry(caller);
    row.times = (row.times || []).filter((t) => now - t < WINDOW_MS);
    row.times.push(now);

    if (row.times.length > MAX_CALLS) {
        const until = now + BLOCK_MS;
        row.blockedUntil = until;
        row.times = [];
        log(`Anti-abus : ${caller} bloque jusqu'a ${new Date(until).toISOString()}`);

        const db = getDb();
        if (db) {
            try {
                await db.from('phone_blocks').upsert({
                    caller,
                    blocked_until: new Date(until).toISOString(),
                    reason: `${MAX_CALLS}_calls_${WINDOW_MS}ms`,
                }, { onConflict: 'caller' });
            } catch (e) {
                warn(`rate-limit block persist: ${e.message}`);
            }
        }
        return { blocked: true, caller, until, count: MAX_CALLS + 1 };
    }

    return { blocked: false, caller, count: row.times.length };
}

module.exports = {
    normalizeCaller,
    isBlocked,
    registerCall,
    WINDOW_MS,
    MAX_CALLS,
    BLOCK_MS,
};
