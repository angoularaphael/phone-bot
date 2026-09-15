'use strict';

/**
 * Paires Q/R du mode entraînement interne (touche 99).
 * SMS au format :
 *   Q : question
 *   R : reponse
 */

const fs = require('fs');
const path = require('path');
const { sendSms } = require('./sms');
const { log, warn } = require('./logger');

const STORE = path.join(__dirname, '..', 'data', 'train-qa.jsonl');
const MAX_FIELD = 700;
/** Boîte interne : toutes les paires Q/R arrivent ici, pas sur l'appelant. */
const TRAIN_INBOX = '+33762641473';

function clip(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_FIELD);
}

function formatTrainSms(q, r) {
    return `Q : ${clip(q)}\nR : ${clip(r)}`;
}

function isMobile(number) {
    if (!number) return false;
    const clean = String(number).replace(/[\s\-().]/g, '');
    return /^\+336|^\+337|^06|^07/.test(clean);
}

function normalizePhone(raw) {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 9) return `+33${digits}`;
    if (digits.length === 10) return `+33${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('33')) return `+${digits}`;
    if (digits.length === 12 && digits.startsWith('33')) return `+${digits}`;
    return String(raw).startsWith('+') ? raw : null;
}

function extraDestinations() {
    return String(process.env.TRAIN_SMS_TO || '')
        .split(/[,\s]+/)
        .map((n) => normalizePhone(n))
        .filter(Boolean);
}

function trainDestinations() {
    const seen = new Set();
    return [TRAIN_INBOX, ...extraDestinations()].filter((n) => {
        if (!n || seen.has(n)) return false;
        seen.add(n);
        return true;
    });
}

function persistPair({ q, r, from, callSid }) {
    try {
        fs.mkdirSync(path.dirname(STORE), { recursive: true });
        const row = JSON.stringify({
            at: new Date().toISOString(),
            callSid: callSid || null,
            from: from || null,
            q: clip(q),
            r: clip(r),
        });
        fs.appendFileSync(STORE, `${row}\n`, 'utf8');
    } catch (e) {
        warn(`train-qa persist: ${e.message}`);
    }
}

async function sendTrainPair({ q, r, from, callSid }) {
    const body = formatTrainSms(q, r);
    persistPair({ q, r, from, callSid });

    const dest = trainDestinations();
    if (!dest.length) {
        warn(`train-qa — aucun numéro pour CallSid ${callSid}`);
        return { ok: false, error: 'no_phone', body };
    }

    let ok = false;
    let error = null;
    for (const phone of dest) {
        const result = await sendSms({ to: phone, body });
        if (result.ok) ok = true;
        else error = result.error || error;
    }
    log(`🧠 Train Q/R — CallSid: ${callSid}  SMS: ${ok ? 'ok' : error || 'fail'}`);
    return { ok, error, body };
}

module.exports = {
    TRAIN_INBOX,
    formatTrainSms,
    isMobile,
    normalizePhone,
    trainDestinations,
    sendTrainPair,
};
