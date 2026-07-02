'use strict';

/**
 * Vérifie que toutes les connexions (Telnyx, Supabase) sont opérationnelles.
 */

const { log, warn } = require('../lib/logger');
const telnyx = require('../lib/telnyx');

module.exports = async function verify() {
    const divider = () => log('─'.repeat(58));

    divider();
    log('🔧 Vérification — Boxing Center Phone Bot (Telnyx)\n');

    log('   Test Telnyx...');
    const tx = await telnyx.verify();
    if (tx.ok) {
        log(`✅ Telnyx OK — numéro : ${tx.phone}`);
    } else {
        warn(`Telnyx : ${tx.error}`);
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        warn('Supabase : SUPABASE_URL ou clé manquante');
    } else {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const db = createClient(url, key);
            const { error } = await db.from('phone_calls').select('id').limit(1);
            if (error) {
                warn(`Supabase : ${error.message}`);
                if (/relation.*does not exist/i.test(error.message)) {
                    warn('→ Exécutez supabase/001_phone_bot.sql');
                }
            } else {
                log('✅ Supabase OK — table phone_calls accessible');
            }
        } catch (e) {
            warn(`Supabase : ${e.message}`);
        }
    }

    const BASE_URL = process.env.BASE_URL;
    log('\n🌐 Configuration :');
    log(`   BASE_URL         : ${BASE_URL || '⚠️  NON DÉFINI'}`);
    log(`   TELNYX_PHONE     : ${process.env.TELNYX_PHONE_NUMBER || '(non défini)'}`);
    log(`   TRANSFER_ACCUEIL : ${process.env.TRANSFER_ACCUEIL || '(non défini)'}`);
    log(`   BOT_DRY_RUN      : ${process.env.BOT_DRY_RUN || 'false'}`);

    log('\n📞 Routing des motifs :');
    const { routes } = require('../config/routing');
    for (const [, r] of Object.entries(routes())) {
        console.log(`   ${r.digit}  ${r.label.padEnd(30)} → ${r.transfer || '(pas de transfert)'}`);
    }

    if (BASE_URL) {
        log('\n🔗 Webhooks Telnyx :');
        log(`   Voice URL   : POST ${BASE_URL}/voice`);
        log(`   Status URL  : POST ${BASE_URL}/voice/status`);
    }

    divider();
};
