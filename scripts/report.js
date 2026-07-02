'use strict';

/**
 * Rapport des appels — statistiques et demandes de rappel en attente.
 * Lancé via : node index.js --report
 */

const { log, warn } = require('../lib/logger');

module.exports = async function report() {
    const divider = () => log('─'.repeat(58));

    divider();
    log('📋 Rapport — Boxing Center Phone Bot\n');

    const {
        getStats,
        getRecentCalls,
        getPendingCallbacks,
        isConfigured,
    } = require('../lib/tracker');

    if (!isConfigured()) {
        warn('Supabase non configuré — impossible de générer le rapport');
        return;
    }

    // ── Appels récents ─────────────────────────────────────────────
    const recent = await getRecentCalls(10);
    log(`📞 10 derniers appels :\n`);

    if (recent.length === 0) {
        log('   Aucun appel enregistré.');
    } else {
        for (const c of recent) {
            const date    = new Date(c.created_at).toLocaleString('fr-FR');
            const motif   = (c.motif_label || c.motif || 'N/A').padEnd(30);
            const status  = c.status.padEnd(20);
            const sms     = c.sms_sent          ? '📱SMS' : '     ';
            const cb      = c.callback_requested ? '📞CB ' : '     ';
            const tr      = c.transferred_to     ? `→${c.transferred_to}` : '';
            console.log(`   ${date}  ${motif}  ${status}  ${sms} ${cb} ${tr}`);
        }
    }

    // ── Statistiques par motif ─────────────────────────────────────
    const stats = await getStats();

    if (stats.length > 0) {
        log(`\n📊 Statistiques (30 derniers jours) :\n`);
        console.log(
            '   ' +
            'Jour'.padEnd(12) +
            'Motif'.padEnd(32) +
            'Appels'.padEnd(8) +
            'SMS'.padEnd(6) +
            'Rappels'.padEnd(10) +
            'Transferts'.padEnd(12) +
            'Durée moy.'
        );
        console.log('   ' + '─'.repeat(88));

        for (const s of stats) {
            console.log(
                '   ' +
                String(s.jour || '?').padEnd(12) +
                (s.motif_label || s.motif || '?').padEnd(32) +
                String(s.total_appels   || 0).padEnd(8) +
                String(s.sms_envoyes    || 0).padEnd(6) +
                String(s.rappels_demandes || 0).padEnd(10) +
                String(s.transferts     || 0).padEnd(12) +
                `${s.duree_moy_sec || 0}s`
            );
        }
    }

    // ── Demandes de rappel en attente ─────────────────────────────
    const callbacks = await getPendingCallbacks();
    log(`\n📞 Demandes de rappel en attente : ${callbacks.length}\n`);

    if (callbacks.length > 0) {
        for (const c of callbacks) {
            const date  = new Date(c.created_at).toLocaleString('fr-FR');
            const name  = c.caller_name  || '(anonyme)';
            const phone = c.caller_phone || c.caller   || '?';
            const motif = c.motif_label  || c.motif    || '?';
            console.log(`   • ${date}  ${name.padEnd(15)}  ${phone.padEnd(16)}  [${motif}]`);
        }
    }

    divider();
};
