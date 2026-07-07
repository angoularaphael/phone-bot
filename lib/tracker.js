'use strict';

/**
 * Persistance des appels dans Supabase.
 * Table : phone_calls
 */

const { createClient } = require('@supabase/supabase-js');
const { warn } = require('./logger');

let _db = null;

function getDb() {
    if (_db) return _db;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    _db = createClient(url, key);
    return _db;
}

function isConfigured() {
    return !!(
        process.env.SUPABASE_URL &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
    );
}

/**
 * Crée ou met à jour un enregistrement d'appel.
 * La colonne call_sid est la clé de déduplication.
 */
async function saveCall(data) {
    const db = getDb();
    if (!db) return;
    if (!data.callSid) {
        warn('Supabase saveCall: CallSid manquant — webhook sans données Twilio (test manuel ?)');
        return;
    }
    try {
        const { error } = await db.from('phone_calls').upsert({
            call_sid:           data.callSid,
            caller:             data.caller             || null,
            called:             data.called             || null,
            motif:              data.motif              || null,
            motif_label:        data.motifLabel         || null,
            status:             data.status             || 'in_progress',
            caller_name:        data.callerName         || null,
            caller_phone:       data.callerPhone        || null,
            sms_sent:           data.smsSent            || false,
            whatsapp_sent:      data.whatsappSent       || false,
            transferred_to:     data.transferredTo      || null,
            callback_requested: data.callbackRequested  || false,
            duration_sec:       data.durationSec        || null,
            recording_url:      data.recordingUrl       || null,
            raw_digits:         data.rawDigits          || null,
            notes:              data.notes              || null,
        }, { onConflict: 'call_sid' });

        if (error) warn(`Supabase saveCall: ${error.message}`);
    } catch (e) {
        warn(`Tracker saveCall: ${e.message}`);
    }
}

/**
 * Met à jour partiellement un appel existant.
 */
async function updateCall(callSid, patch) {
    const db = getDb();
    if (!db) return;
    try {
        const mapped = {};
        if (patch.motif             !== undefined) mapped.motif              = patch.motif;
        if (patch.motifLabel        !== undefined) mapped.motif_label        = patch.motifLabel;
        if (patch.status            !== undefined) mapped.status             = patch.status;
        if (patch.callerName        !== undefined) mapped.caller_name        = patch.callerName;
        if (patch.callerPhone       !== undefined) mapped.caller_phone       = patch.callerPhone;
        if (patch.smsSent           !== undefined) mapped.sms_sent           = patch.smsSent;
        if (patch.whatsappSent      !== undefined) mapped.whatsapp_sent      = patch.whatsappSent;
        if (patch.transferredTo     !== undefined) mapped.transferred_to     = patch.transferredTo;
        if (patch.callbackRequested !== undefined) mapped.callback_requested = patch.callbackRequested;
        if (patch.durationSec       !== undefined) mapped.duration_sec       = patch.durationSec;
        if (patch.recordingUrl      !== undefined) mapped.recording_url      = patch.recordingUrl;
        if (patch.rawDigits         !== undefined) mapped.raw_digits         = patch.rawDigits;
        if (patch.notes             !== undefined) mapped.notes              = patch.notes;

        if (Object.keys(mapped).length === 0) return;

        const { error } = await db
            .from('phone_calls')
            .update(mapped)
            .eq('call_sid', callSid);

        if (error) warn(`Supabase updateCall: ${error.message}`);
    } catch (e) {
        warn(`Tracker updateCall: ${e.message}`);
    }
}

/**
 * Retourne les statistiques agrégées par jour/motif (vue dashboard).
 */
async function getStats() {
    const db = getDb();
    if (!db) return [];
    try {
        const { data, error } = await db
            .from('phone_calls_dashboard')
            .select('*')
            .order('jour', { ascending: false })
            .limit(30);
        if (error) warn(`Supabase getStats: ${error.message}`);
        return data || [];
    } catch (e) {
        warn(`Tracker getStats: ${e.message}`);
        return [];
    }
}

/**
 * Retourne les N appels les plus récents.
 */
async function getRecentCalls(limit = 20) {
    const db = getDb();
    if (!db) return [];
    try {
        const { data, error } = await db
            .from('phone_calls')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) warn(`Supabase getRecentCalls: ${error.message}`);
        return data || [];
    } catch (e) {
        warn(`Tracker getRecentCalls: ${e.message}`);
        return [];
    }
}

/**
 * Retourne les demandes de rappel en attente.
 */
async function getPendingCallbacks() {
    const db = getDb();
    if (!db) return [];
    try {
        const { data, error } = await db
            .from('phone_calls')
            .select('*')
            .eq('callback_requested', true)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) warn(`Supabase getPendingCallbacks: ${error.message}`);
        return data || [];
    } catch (e) {
        warn(`Tracker getPendingCallbacks: ${e.message}`);
        return [];
    }
}

module.exports = {
    saveCall,
    updateCall,
    getStats,
    getRecentCalls,
    getPendingCallbacks,
    isConfigured,
};
