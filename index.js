'use strict';

/**
 * Boxing Center — Phone Bot
 * ═══════════════════════════════════════════════════════════════
 *  node index.js            → démarre le serveur HTTP (webhooks Twilio)
 *  node index.js --verify   → vérifie les connexions (Twilio + Supabase)
 *  node index.js --report   → rapport des appels et demandes de rappel
 *  node index.js --dev      → serveur avec logs détaillés
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();

const express = require('express');
const { log, warn, err } = require('./lib/logger');

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

// ─── Imports des flows ────────────────────────────────────────────────────────

const { welcome }                            = require('./flows/welcome');
const { menu }                               = require('./flows/menu');
const { dispatch }                           = require('./flows/dispatch');
const { answer }                             = require('./flows/answer');
const { sub }                                = require('./flows/sub');
const { collectName, collectPhone, collectSave }          = require('./flows/collect');
const { whatsappName, whatsappPhone, whatsappSave }       = require('./flows/whatsapp');
const { callback }                           = require('./flows/callback');
const { human, fallback, recorded }          = require('./flows/human');
const { bye }                                = require('./flows/bye');
const { statusCallback }                     = require('./flows/status');

// ─── Application Express ──────────────────────────────────────────────────────

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Logs des requêtes entrantes en mode dev
if (args.has('--dev') || process.env.DEBUG === 'true') {
    app.use((req, res, next) => {
        log(`→ ${req.method} ${req.path}  body: ${JSON.stringify(req.body)}`);
        next();
    });
}

// ─── Routes vocales (webhooks Twilio) ─────────────────────────────────────────

// Appel entrant — URL à configurer dans Twilio Console
app.post('/voice',               welcome);

// Navigation du menu
app.post('/voice/menu',          menu);
app.post('/voice/dispatch',      dispatch);

// Réponse vocale par motif + sous-menu
app.post('/voice/answer',        answer);
app.post('/voice/sub',           sub);

// Collecte coordonnées pour SMS
app.post('/voice/collect/name',  collectName);
app.post('/voice/collect/phone', collectPhone);
app.post('/voice/collect/save',  collectSave);

// Collecte coordonnées pour WhatsApp
app.post('/voice/whatsapp/name',  whatsappName);
app.post('/voice/whatsapp/phone', whatsappPhone);
app.post('/voice/whatsapp/save',  whatsappSave);

// Actions
app.post('/voice/callback',      callback);
app.post('/voice/human',         human);
app.post('/voice/fallback',      fallback);
app.post('/voice/recorded',      recorded);
app.post('/voice/bye',           bye);

// Callback de statut Twilio (durée, fin d'appel)
app.post('/voice/status',        statusCallback);

// ─── Health check ─────────────────────────────────────────────────────────────

const startedAt   = new Date().toISOString();
let   totalCalls  = 0;

app.use('/voice', (req, res, next) => { if (req.method === 'POST' && req.path === '/') totalCalls++; next(); });

app.get('/health', (req, res) => {
    res.json({
        service:    'phone-bot',
        status:     'running',
        startedAt,
        uptimeSec:  Math.round(process.uptime()),
        totalCalls,
        dryRun:     process.env.BOT_DRY_RUN === 'true',
        baseUrl:    process.env.BASE_URL     || '(non défini)',
    });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '3000', 10);

app.listen(PORT, () => {
    log('─'.repeat(58));
    log(`🥊 Boxing Center Phone Bot — port ${PORT}`);

    const BASE_URL = process.env.BASE_URL;
    if (BASE_URL) {
        log(`   Voice URL   → POST ${BASE_URL}/voice`);
        log(`   Status URL  → POST ${BASE_URL}/voice/status`);
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
