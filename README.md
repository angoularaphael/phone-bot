# Boxing Center — Phone Bot

Bot téléphonique pour la ligne principale de Boxing Center.
Gère les appels entrants via **Twilio**, répond aux questions fréquentes,
envoie des SMS/WhatsApp, collecte les coordonnées et transfère vers un conseiller.

---

## Fonctionnalités

| Feature | Détail |
|---|---|
| Accueil vocal | Message de bienvenue + menu à 9 choix |
| Identification du motif | DTMF (touches) + classification vocale |
| Réponses automatiques | 8 catégories pré-enregistrées (voix Polly Lea-Neural) |
| Envoi SMS | Informations + lien URL personnalisé par motif |
| WhatsApp | Via Twilio Sandbox ou numéro Business |
| Collecte coordonnées | Prénom (reconnaissance vocale) + téléphone (DTMF) |
| Demande de rappel | Enregistrée en base avec nom + numéro |
| Transfert humain | Renvoi vers un conseiller selon le motif |
| Répondeur | Enregistrement vocal si conseiller indisponible |
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

## Arbre de décision

```
Appel entrant
  └─ Accueil + Menu principal (touches 1-9)
       ├─ 1-7 ou 9 → Réponse vocale automatique
       │               └─ Sous-menu :
       │                    ├─ 1 → Envoyer SMS
       │                    │       └─ Collecte prénom (vocal)
       │                    │           └─ Envoi SMS + confirmation
       │                    ├─ 2 → Demande de rappel → Confirmation
       │                    ├─ 3 → Transfert humain
       │                    │       ├─ Décroché → conversation
       │                    │       └─ Non décroché → Répondeur
       │                    └─ * → Retour menu
       └─ 8 → Transfert humain direct
```

---

## Installation

```bash
cd phone-bot
npm install
cp .env.example .env
# Remplir les valeurs dans .env
```

### Prérequis

1. **Compte Twilio** avec un numéro de téléphone (voix + SMS)
2. **ngrok** (en développement) pour exposer le serveur en HTTPS
3. **Supabase** — exécuter le SQL de migration

### Migration Supabase

Exécuter dans l'éditeur SQL de Supabase :

```sql
-- Coller le contenu de supabase/001_phone_bot.sql
```

---

## Démarrage

```bash
# Démarrer le serveur
npm start
# ou
node index.js

# Vérifier les connexions
node index.js --verify

# Rapport des appels
node index.js --report

# Mode développement (logs détaillés)
node index.js --dev
```

---

## Configuration Twilio

Dans **Twilio Console → Phone Numbers → votre numéro** :

| Champ | Valeur |
|---|---|
| Voice — A call comes in | Webhook — `POST https://VOTRE_URL/voice` |
| Voice — Status callback URL | `POST https://VOTRE_URL/voice/status` |

En développement avec ngrok :

```bash
ngrok http 3000
# Copier l'URL HTTPS générée dans BASE_URL du .env
```

---

## Variables d'environnement

| Variable | Description |
|---|---|
| `BASE_URL` | URL publique du serveur (HTTPS requis par Twilio) |
| `TWILIO_ACCOUNT_SID` | SID de votre compte Twilio |
| `TWILIO_AUTH_TOKEN` | Token d'authentification Twilio |
| `TWILIO_PHONE_NUMBER` | Numéro Twilio au format E.164 (+33...) |
| `TWILIO_WHATSAPP_NUMBER` | Numéro WhatsApp Twilio Sandbox |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase |
| `TRANSFER_ACCUEIL` | Numéro de renvoi — accueil général |
| `TRANSFER_ADMIN` | Numéro de renvoi — service administratif |
| `TRANSFER_COMPETITION` | Numéro de renvoi — responsable compétition |
| `LINK_ESSAI` | URL de réservation séance d'essai |
| `LINK_PLANNING` | URL du planning en ligne |
| `BOT_DRY_RUN` | `true` = simulation sans SMS ni transfert |

---

## Structure du projet

```
phone-bot/
├── index.js              ← Serveur Express (point d'entrée)
├── config/
│   ├── messages.js       ← Tous les messages vocaux (TTS)
│   └── routing.js        ← Table de routage motif → numéro + SMS
├── flows/
│   ├── welcome.js        ← Accueil de l'appel entrant
│   ├── menu.js           ← Menu principal (rappelable)
│   ├── dispatch.js       ← Aiguillage par touche
│   ├── answer.js         ← Réponse vocale + sous-menu
│   ├── sub.js            ← Traitement du sous-menu
│   ├── collect.js        ← Collecte prénom + téléphone
│   ├── callback.js       ← Demande de rappel
│   ├── human.js          ← Transfert + fallback + répondeur
│   ├── bye.js            ← Au revoir + raccrochage
│   └── status.js         ← Webhook statut fin d'appel
├── lib/
│   ├── logger.js         ← log / warn / err
│   ├── url.js            ← Construction des URLs webhook
│   ├── twiml.js          ← Générateurs TwiML
│   ├── classifier.js     ← Classification vocale → motif
│   ├── sms.js            ← Envoi SMS + WhatsApp
│   ├── tracker.js        ← Persistance Supabase
│   └── transfer.js       ← Résolution du numéro de transfert
├── scripts/
│   ├── verify.js         ← Test des connexions
│   └── report.js         ← Rapport appels + rappels
└── supabase/
    └── 001_phone_bot.sql ← Schéma de la base de données
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
