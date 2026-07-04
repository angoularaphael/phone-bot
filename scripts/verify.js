'use strict';

/**
 * Vérifie que toutes les connexions (Twilio, Supabase) sont opérationnelles.
 * Lancé via : node index.js --verify
 */

const { log, warn } = require('../lib/logger');

module.exports = async function verify() {
    const divider = () => log('─'.repeat(58));

    divider();
    log('🔧 Vérification des connexions — Boxing Center Phone Bot\n');

    // ── Twilio ─────────────────────────────────────────────────────
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const phone = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token) {
        warn('Twilio : TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant');
    } else if (!phone) {
        warn('Twilio : TWILIO_PHONE_NUMBER manquant');
    } else {
        try {
            const twilio = require('twilio')(sid, token);
            const account = await twilio.api.accounts(sid).fetch();
            log(`✅ Twilio OK — compte : ${account.friendlyName}`);
            log(`   Numéro bot : ${phone}`);
        } catch (e) {
            warn(`Twilio : ${e.message}`);
        }
    }

    // ── Supabase ───────────────────────────────────────────────────
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        warn('Supabase : SUPABASE_URL ou clé manquante');
    } else {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const db = createClient(url, key);
            const { data, error } = await db.from('phone_calls').select('id').limit(1);
            if (error) {
                warn(`Supabase : ${error.message}`);
                if (/relation.*does not exist/i.test(error.message)) {
                    warn('→ Exécutez supabase/001_phone_bot.sql pour créer les tables');
                }
            } else {
                log(`✅ Supabase OK — table phone_calls accessible`);
            }
        } catch (e) {
            warn(`Supabase : ${e.message}`);
        }
    }

    // ── Configuration générale ─────────────────────────────────────
    const BASE_URL = process.env.BASE_URL;
    log(`\n🌐 Configuration :`);
    log(`   BASE_URL        : ${BASE_URL || '⚠️  NON DÉFINI — requis pour les webhooks Twilio'}`);
    log(`   TRANSFER_ACCUEIL: ${process.env.TRANSFER_ACCUEIL || '(non défini)'}`);
    log(`   TRANSFER_ADMIN  : ${process.env.TRANSFER_ADMIN   || '(non défini)'}`);
    log(`   BOT_DRY_RUN     : ${process.env.BOT_DRY_RUN      || 'false'}`);

    // ── Routing ────────────────────────────────────────────────────
    log(`\n📞 Routing des motifs :`);
    const { routes } = require('../config/routing');
    for (const [motif, r] of Object.entries(routes())) {
        const dest = r.transfer || '(pas de transfert)';
        console.log(`   ${r.digit}  ${r.label.padEnd(30)} → ${dest}`);
    }

    log(`\n🔗 Webhooks Twilio à configurer :`);
    if (BASE_URL) {
        log(`   Appel entrant (Voice URL) : POST ${BASE_URL}/voice`);
        log(`   Status callback           : POST ${BASE_URL}/voice/status`);
    } else {
        warn('Définissez BASE_URL dans .env pour afficher les URLs de webhook');
    }

    divider();
};
