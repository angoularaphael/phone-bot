'use strict';

/**
 * Boxing Center — Phone Bot
 * ═══════════════════════════════════════════════════════════════
 *  node index.js            → démarre le serveur HTTP (webhooks Telnyx)
 *  node index.js --verify   → vérifie les connexions (Telnyx + Supabase)
 *  node index.js --report   → rapport des appels et demandes de rappel
 *  node index.js --dev      → serveur avec logs détaillés
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();

const express = require('express');
const { log, warn, err } = require('./lib/logger');
const { handle: callControl } = require('./flows/callcontrol');

// ─── Flags CLI ────────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));

if (args.has('--verify')) {
    require('./scripts/verify')().then(() => process.exit(0)).catch(e => { err(e.message); process.exit(1); });
    return;
}

if (args.has('--report')) {
    require('./scripts/report')().then(() => process.exit(0)).catch(e => { err(e.message); process.exit(1); });
    return;
}

// ─── Application Express ──────────────────────────────────────────────────────

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (args.has('--dev') || process.env.DEBUG === 'true') {
    app.use((req, res, next) => {
        if (req.path.startsWith('/voice')) {
            log(`→ ${req.method} ${req.path}`);
        }
        next();
    });
}

// ─── Webhooks Telnyx Call Control ─────────────────────────────────────────────

const startedAt  = new Date().toISOString();
let   totalCalls = 0;

function getEventType(body) {
    return body?.data?.event_type || '';
}

function countIncoming(req, res, next) {
    if (getEventType(req.body) === 'call.initiated') totalCalls++;
    next();
}

app.post('/voice',        countIncoming, callControl);
app.post('/voice/status', callControl);

app.get('/health', (req, res) => {
    res.json({
        service:    'phone-bot',
        provider:   'telnyx',
        status:     'running',
        startedAt,
        uptimeSec:  Math.round(process.uptime()),
        totalCalls,
        dryRun:     process.env.BOT_DRY_RUN === 'true',
        baseUrl:    process.env.BASE_URL || '(non défini)',
        phone:      process.env.TELNYX_PHONE_NUMBER || '(non défini)',
    });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '3000', 10);

app.listen(PORT, () => {
    log('─'.repeat(58));
    log(`🥊 Boxing Center Phone Bot (Telnyx) — port ${PORT}`);

    const BASE_URL = process.env.BASE_URL;
    if (BASE_URL) {
        log(`   Webhook     → POST ${BASE_URL}/voice`);
        log(`   Status      → POST ${BASE_URL}/voice/status`);
        log(`   Health      → GET  ${BASE_URL}/health`);
    } else {
        warn('BASE_URL non défini — configurez-le dans .env');
        log(`   Health      → GET  http://localhost:${PORT}/health`);
    }

    if (process.env.BOT_DRY_RUN === 'true') {
        warn('Mode DRY-RUN actif — aucun SMS ne sera envoyé');
    }
    log('─'.repeat(58));
});
