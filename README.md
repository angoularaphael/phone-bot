# Boxing Center — Phone Bot

Bot téléphonique pour la ligne principale de Boxing Center.
Gère les appels entrants via **Telnyx Call Control**, répond aux questions fréquentes,
envoie des SMS, collecte les coordonnées et transfère vers un conseiller.

---

## Fonctionnalités

| Feature | Détail |
|---|---|
| Accueil vocal | Message de bienvenue + menu à 9 choix |
| Identification du motif | DTMF (touches) |
| Réponses automatiques | 8 catégories (TTS Azure fr-FR) |
| Envoi SMS | Informations + lien URL personnalisé par motif |
| Collecte téléphone | DTMF si numéro fixe détecté |
| Demande de rappel | Enregistrée en base avec numéro appelant |
| Transfert humain | Renvoi vers un conseiller selon le motif |
| Supabase | Historique complet + tableau de bord |

---

## Motifs d'appel gérés

| Touche | Motif |
|:---:|---|
| 1 | Horaires et accès à la salle |
| 2 | Tarifs, offre été et offre rentrée |
| 3 | Séance d'essai gratuite |
| 4 | Inscription |
| 5 | Planning des cours (enfants, adultes) |
| 6 | Compétition |
| 7 | Problème administratif, résiliation, facture |
| 8 | Parler directement à un conseiller |
| 9 | Autre demande |

---

## Sous-menu (après une réponse vocale)

| Touche | Action |
|:---:|---|
| 1 | Recevoir les infos par SMS |
| 2 | WhatsApp (fallback SMS) |
| 3 | Demander un rappel |
| 4 | Parler à un conseiller |
| * | Retour au menu principal |

---

## Installation

```bash
cd phone-bot
npm install
cp .env.example .env
# Remplir les valeurs dans .env
```

### Prérequis

1. **Compte Telnyx** avec un numéro Voice (+ SMS pour l'envoi de textos)
2. **Application Voice API** Telnyx avec webhook vers votre serveur
3. **Supabase** — exécuter le SQL de migration

### Migration Supabase

Exécuter dans l'éditeur SQL de Supabase :

```sql
-- Coller le contenu de supabase/001_phone_bot.sql
```

---

## Démarrage

```bash
npm start
node index.js --verify
node index.js --report
node index.js --dev
```

---

## Configuration Telnyx

Dans **Telnyx Portal → Voice → Call Control Applications** :

| Champ | Valeur |
|---|---|
| Webhook URL | `POST http://VOTRE_URL/voice` |
| Webhook API version | v2 |

Associer votre numéro à l'application Voice.

Pour les **SMS**, créer un **Messaging Profile** et l'associer au numéro.

> Sur bot-hosting, HTTP est accepté (pas besoin de HTTPS pour les tests).

---

## Variables d'environnement

| Variable | Description |
|---|---|
| `BASE_URL` | URL publique du serveur (ex. `http://prem-eu5.bot-hosting.cloud:20959`) |
| `TELNYX_API_KEY` | Clé API Telnyx |
| `TELNYX_PHONE_NUMBER` | Numéro Telnyx au format E.164 (`+18592098919`) |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase |
| `TRANSFER_ACCUEIL` | Numéro de renvoi — accueil général |
| `TRANSFER_ADMIN` | Numéro de renvoi — service administratif |
| `TRANSFER_COMPETITION` | Numéro de renvoi — responsable compétition |
| `LINK_ESSAI` | URL de réservation séance d'essai |
| `LINK_PLANNING` | URL du planning en ligne |
| `BOT_DRY_RUN` | `true` = simulation sans SMS ni transfert |
| `BOT_VOICE` | Voix TTS (défaut : `Azure.fr-FR-DeniseNeural`) |

---

## Déploiement bot-hosting

1. Copier `bootstrap.js` → `/home/container/index.js`
2. Copier `env.bothosting` → `/home/container/.env` (avec vos clés)
3. Redémarrer le serveur

Le bootstrap clone le repo GitHub, installe les dépendances et lance le bot.

---

## Structure du projet

```
phone-bot/
├── index.js              ← Serveur Express (webhooks Telnyx)
├── bootstrap.js          ← Script de démarrage bot-hosting
├── config/
│   ├── messages.js       ← Messages vocaux (TTS)
│   └── routing.js        ← Routage motif → transfert + SMS
├── flows/
│   └── callcontrol.js    ← Machine à états Call Control v2
├── lib/
│   ├── telnyx.js         ← Client API Telnyx
│   ├── state.js          ← client_state (base64)
│   ├── sms.js            ← Envoi SMS
│   ├── tracker.js        ← Persistance Supabase
│   └── transfer.js       ← Numéro de transfert
└── supabase/
    └── 001_phone_bot.sql ← Schéma base de données
```

---

## Tableau de suivi (Supabase)

La vue `phone_calls_dashboard` agrège par jour et motif :

- Nombre total d'appels
- SMS envoyés
- Demandes de rappel
- Transferts effectués
- Durée moyenne d'appel

La vue `pending_callbacks` liste les rappels en attente à traiter.
