'use strict';

/**
 * Vérifie les connexions (voix Telnyx/Twilio + Supabase).
 * Lancé via : node index.js --verify
 */

const { log, warn } = require('../lib/logger');
const {
    voiceProvider,
    voicePhoneNumber,
    telnyxConfigured,
    twilioConfigured,
} = require('../lib/provider');

module.exports = async function verify() {
    const divider = () => log('─'.repeat(58));
    const provider = voiceProvider();

    divider();
    log('Verification des connexions — Boxing Center Phone Bot\n');
    log(`Fournisseur voix : ${provider}\n`);

    // ── Voix Telnyx ────────────────────────────────────────────────
    if (provider === 'telnyx') {
        const key = process.env.TELNYX_API_KEY;
        const phone = voicePhoneNumber();
        if (!key) {
            warn('Telnyx : TELNYX_API_KEY manquant');
        } else if (!phone) {
            warn('Telnyx : TELNYX_PHONE_NUMBER manquant');
        } else {
            try {
                const res = await fetch('https://api.telnyx.com/v2/balance', {
                    headers: { Authorization: `Bearer ${key}` },
                });
                if (!res.ok) {
                    const body = await res.text();
                    warn(`Telnyx : HTTP ${res.status} — ${body.slice(0, 120)}`);
                } else {
                    const json = await res.json();
                    const bal = json?.data?.balance ?? json?.data?.credit_balance ?? '?';
                    log(`Telnyx OK — solde : ${bal}`);
                    log(`   Numero bot : ${phone}`);
                }
            } catch (e) {
                warn(`Telnyx : ${e.message}`);
            }
        }
        if (!telnyxConfigured()) {
            warn('Telnyx incomplet — VOICE_PROVIDER=telnyx mais cle / numero manquants');
        }
    }

    // ── Twilio (voix si actif, ou SMS interne) ──────────────────────
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const phone = process.env.TWILIO_PHONE_NUMBER;

    if (provider === 'twilio' || process.env.TWILIO_ACCOUNT_SID) {
        if (!sid || !token) {
            if (provider === 'twilio') warn('Twilio : TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant');
            else log('Twilio : non configure (SMS interne 99 indisponible)');
        } else if (!phone && provider === 'twilio') {
            warn('Twilio : TWILIO_PHONE_NUMBER manquant');
        } else {
            try {
                const twilio = require('twilio')(sid, token);
                const account = await twilio.api.accounts(sid).fetch();
                log(`Twilio OK — compte : ${account.friendlyName}`);
                if (phone) log(`   Numero Twilio : ${phone}`);
                if (provider === 'telnyx') log('   (conserve pour SMS interne menu 99)');
            } catch (e) {
                warn(`Twilio : ${e.message}`);
            }
        }
    }

    // ── Supabase ───────────────────────────────────────────────────
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        warn('Supabase : SUPABASE_URL ou cle manquante');
    } else {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const db = createClient(url, key);
            const { data, error } = await db.from('phone_calls').select('id').limit(1);
            if (error) {
                warn(`Supabase : ${error.message}`);
                if (/relation.*does not exist/i.test(error.message)) {
                    warn('-> Executez supabase/001_phone_bot.sql pour creer les tables');
                }
            } else {
                log(`Supabase OK — table phone_calls accessible`);
            }
        } catch (e) {
            warn(`Supabase : ${e.message}`);
        }
    }

    // ── Configuration generale ─────────────────────────────────────
    const BASE_URL = process.env.BASE_URL;
    log(`\nConfiguration :`);
    log(`   VOICE_PROVIDER  : ${provider}`);
    log(`   BASE_URL        : ${BASE_URL || 'NON DEFINI — requis pour les webhooks'}`);
    log(`   Numero voix     : ${voicePhoneNumber() || '(non defini)'}`);
    log(`   BOT_DRY_RUN     : ${process.env.BOT_DRY_RUN || 'false'}`);
    log(`   AI_PROVIDER     : ${process.env.AI_PROVIDER || 'gemini'}`);
    log(`   GEMINI_API_KEY  : ${Object.keys(process.env).some((k) => /^GEMINI_API_KEY/.test(k) && String(process.env[k] || '').startsWith('AIza')) ? '(defini)' : 'manquant — repli Groq'}`);
    log(`   GROQ_API_KEY    : ${process.env.GROQ_API_KEY ? '(defini)' : 'manquant'}`);
    log(`   SMS public      : options 1-2 (boutique / site)`);
    log(`   SMS interne 99  : ${twilioConfigured() ? `${process.env.TWILIO_PHONE_NUMBER} -> 07 62 64 14 73` : 'Twilio requis'}`);
    log(`   Transfert humain: desactive`);

    // ── Routing ────────────────────────────────────────────────────
    log(`\nRouting des motifs :`);
    const { routes } = require('../config/routing');
    for (const [motif, r] of Object.entries(routes())) {
        const dest = r.transfer ? r.transfer : 'reponse vocale (pas de transfert)';
        console.log(`   ${r.digit}  ${r.label.padEnd(30)} → ${dest}`);
    }

    log(`\nWebhooks a configurer (${provider}) :`);
    if (BASE_URL) {
        log(`   Appel entrant (Voice URL) : POST ${BASE_URL}/voice`);
        log(`   Status callback           : POST ${BASE_URL}/voice/status`);
        log(`   SMS entrant (ignore)      : POST ${BASE_URL}/sms`);
    } else {
        warn('Definissez BASE_URL dans .env pour afficher les URLs de webhook');
    }

    if (provider === 'telnyx') {
        log(`\nTelnyx Mission Control :`);
        log(`   1. Creer une TeXML Application`);
        log(`   2. Voice URL = POST ${BASE_URL || 'https://VOTRE_URL'}/voice`);
        log(`   3. Status callback = POST ${BASE_URL || 'https://VOTRE_URL'}/voice/status`);
        log(`   4. Assigner le numero FR a cette application`);
        log(`   5. VOICE_PROVIDER=telnyx dans .env puis redemarrer`);
    }

    divider();
};
