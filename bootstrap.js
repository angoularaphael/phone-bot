'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const GITHUB_REPO   = 'https://github.com/angoularaphael/phone-bot.git';
const APP_DIR_NAME  = 'phone-bot-app';
const APP_DIR       = path.join(__dirname, APP_DIR_NAME);
const ROOT_ENV_PATH = path.join(__dirname, '.env');

// ─── 1. Lire le .env racine ───────────────────────────────────────────────────

function loadRootEnv() {
    if (!fs.existsSync(ROOT_ENV_PATH)) return;
    for (const line of fs.readFileSync(ROOT_ENV_PATH, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq < 1) continue;
        const key = t.slice(0, eq).trim();
        let   val = t.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
    }
}

loadRootEnv();

// ─── 2. Vérifier le port ──────────────────────────────────────────────────────

const PORT = String(process.env.SERVER_PORT || process.env.PORT || '').trim();
if (!PORT || !/^\d+$/.test(PORT)) {
    console.error('❌  SERVER_PORT manquant dans /home/container/.env — ajoutez votre port bot-hosting.');
    process.exit(1);
}

console.log('════════════════════════════════════════════════');
console.log('  📞 BOXING CENTER — PHONE BOT  (bootstrap)');
console.log(`  Port : ${PORT}`);
console.log('════════════════════════════════════════════════\n');

// Afficher l'IP publique du container
try {
    require('https').get('https://api.ipify.org', (r) => {
        let d = '';
        r.on('data', (c) => { d += c; });
        r.on('end',  () => {
            console.log(`🌍 IP container : http://${d.trim()}:${PORT}/`);
            const base = process.env.BASE_URL;
            if (base) console.log(`🌍 URL publique : ${base}`);
        });
    }).on('error', () => {});
} catch {}

// ─── 3. Clone / pull du repo ──────────────────────────────────────────────────

function run(cmd, cwd) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd: cwd || __dirname, stdio: 'inherit' });
}

if (!fs.existsSync(APP_DIR)) {
    console.log('\n📥 Clonage du repo...');
    run(`git clone ${GITHUB_REPO} ${APP_DIR_NAME}`);
} else {
    console.log('\n🔄 Mise à jour du repo...');
    try { run('git pull', APP_DIR); } catch (e) { console.warn('git pull échoué (ignoré) :', e.message); }
}

// ─── 4. Copier le .env dans l'app ────────────────────────────────────────────

const APP_ENV = path.join(APP_DIR, '.env');

if (fs.existsSync(ROOT_ENV_PATH)) {
    fs.copyFileSync(ROOT_ENV_PATH, APP_ENV);
    console.log('✅ .env copié vers l\'app');
} else {
    // Génère un .env minimal depuis les variables d'environnement du panneau
    const ENV_KEYS = [
        'PORT', 'SERVER_PORT', 'BASE_URL',
        'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'TWILIO_WHATSAPP_NUMBER',
        'WHATSAPP_PROVIDER', 'WHATSAPP_BOT_URL', 'SITE_API_SECRET',
        'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
        'TRANSFER_ACCUEIL', 'TRANSFER_ADMIN', 'TRANSFER_COMPETITION',
        'BOXING_WEBSITE', 'LINK_HORAIRES', 'LINK_TARIFS', 'LINK_ESSAI',
        'LINK_INSCRIPTION', 'LINK_PLANNING', 'LINK_COMPETITION',
        'BOT_DRY_RUN', 'DEBUG', 'BOT_VOICE', 'BOT_LANGUAGE',
    ];
    const lines = ['# Auto-généré par bootstrap.js'];
    for (const k of ENV_KEYS) {
        const v = process.env[k];
        if (v) lines.push(/[\s#]/.test(v) ? `${k}="${v.replace(/"/g, '\\"')}"` : `${k}=${v}`);
    }
    fs.writeFileSync(APP_ENV, lines.join('\n') + '\n', 'utf8');
    console.log('✅ .env généré depuis les variables du panneau');
}

// ─── 5. npm install ───────────────────────────────────────────────────────────

console.log('\n📦 Installation des dépendances...');
run('npm install --omit=dev', APP_DIR);

// ─── 6. Lancer le serveur ─────────────────────────────────────────────────────

console.log('\n🚀 Démarrage Phone Bot (serveur webhooks Twilio)...\n');
process.chdir(APP_DIR);
require(path.join(APP_DIR, 'index.js'));
