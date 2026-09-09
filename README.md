# Boxing Center — Phone Bot

Bot téléphonique de la ligne principale Boxing Center (09 39 03 67 48).
Gère les appels via **Twilio** : **David** (voix homme **Polly.Remi-Neural**), menu à touches, SMS, demande de rappel.

**Aucun transfert vers un humain.** Le bot lit des réponses courtes (horaires, tarifs, planning par salle, résiliation).

---

## Fonctionnalités

| Feature | Détail |
|---|---|
| Accueil | David + menu 4 touches (texte coach) |
| Touche 1 | Inscription, formules et tarifs (29 € / 4 semaines) |
| Touche 2 | Planning, horaires, disciplines → sous-menu |
| Touche 3 | Gérer l'abonnement / facture |
| Touche 4 | Autre motif (question, SMS, rappel) |
| Après une réponse | 1 SMS · 2 rappel · * menu · ou une nouvelle question |
| Parole | David écoute (Twilio STT) et répond (Gemini, repli Groq) |
| Supabase | Historique d'appels |

---

## Parcours d'appel

```
Appel entrant
  └─ « Boxing Center, bonjour, c'est David. » + menu coach 1–4
       ├─ 1 Inscription / tarifs → réponse courte
       ├─ 2 Planning, horaires, disciplines
       │     ├─ 1 Horaires
       │     ├─ 2 Planning → 1 Minimes · 2 Portet · 3 Ramonville · 4 Saint-Cyprien · 5 États-Unis
       │     └─ 3 Disciplines
       ├─ 3 Abonnement / facture → réponse courte
       ├─ 4 Autre motif
       └─ Parole (question) → converse (Gemini / Groq)
            └─ Après une réponse :
                 1 SMS · 2 rappel · * menu · ou une autre question
```

Pas de WhatsApp. Pas de touche « conseiller ». Pas de `Dial`.

Faits de référence (alignés sur la boutique, 24/08/2026) :

- Ouverture : lundi–samedi 10h–21h30. Dimanche fermé.
- Offre : 29 € toutes les 4 semaines (28 jours, jamais « par mois ») · 259 € / 12 mois.
- Essai : 10 € (après les offres d'abonnement).
- Résiliation sans engagement : uniquement en ligne (Gérer mon abonnement), plus de 72 h avant le prélèvement.

---

## Installation

```bash
cd phone-bot
npm install
cp .env.example .env
```

### Prérequis

1. Compte Twilio (voix + SMS)
2. Clé Groq (`GROQ_API_KEY`, préfixe `gsk_`) — relais Gemini / Mistral possibles (secours parole)
3. HTTPS public (`BASE_URL`) pour les webhooks
4. Supabase — migration `supabase/001_phone_bot.sql`

---

## Démarrage

```bash
npm start
node index.js --verify
node index.js --report
node index.js --dev
```

---

## Configuration Twilio

| Champ | Valeur |
|---|---|
| Voice — A call comes in | `POST https://VOTRE_URL/voice` |
| Voice — Status callback URL | `POST https://VOTRE_URL/voice/status` |

---

## Variables d'environnement

| Variable | Description |
|---|---|
| `BASE_URL` | URL publique HTTPS |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Compte Twilio (voix + SMS) |
| `TWILIO_PHONE_NUMBER` | Numéro voix / SMS |
| `GROQ_API_KEY` | Repli si Gemini absent |
| `GEMINI_API_KEY` / `GEMINI_API_KEY_1` | Clés boutique Vercel — David les utilise en premier |
| `AI_PROVIDER` | Défaut `gemini` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Historique appels |
| `LINK_GERER_ABO` | Lien SMS résiliation |
| `BOT_VOICE` | Défaut `Polly.Remi-Neural` (homme, français). Option : `Polly.Rémi-Generative` |
| `BOT_SPEECH_RATE` | Débit David. Défaut `120%` (un peu plus vite). `100%` = normal, `130%` = encore plus rapide |
| `BOT_DRY_RUN` | `true` = pas de SMS réel |
| `USE_AI_REPLY` | `false` = pas de LLM même en secours parole |

`TRANSFER_ACCUEIL` / `_ADMIN` / `_COMPETITION` peuvent rester dans le `.env` : elles **ne sont plus lues**.

---

## Interne — entraînement (99)

Pas annoncé au menu. Pendant l'accueil (ou plus tard) : **9** puis **9**.

1. Touche **1** : poser la question (après le bip)
2. Touche **2** : enregistrer la réponse
3. Un SMS part sur le mobile qui appelle :

```
Q : …
R : …
```

Étoile pour revenir au menu. Copie optionnelle : `TRAIN_SMS_TO` dans le `.env`.

---

## Structure

```
phone-bot/
├── index.js
├── config/
│   ├── kb.js             ← faits + SPOKEN_PLANNING par salle
│   ├── voice-prompt.js   ← identité David (secours LLM)
│   ├── messages.js       ← accueil, menu, réponses courtes
│   └── routing.js        ← touches 1–4
├── flows/
│   ├── welcome.js        ← menu DTMF
│   ├── dispatch.js       ← 1 tarifs · 2 pratique · 3 abo · 4 autre
│   ├── pratique.js       ← horaires / planning / disciplines
│   ├── salle.js          ← sous-menu 5 salles
│   ├── answer.js         ← texte figé + sous-menu
│   ├── sub.js            ← SMS / rappel / *
│   ├── converse.js       ← secours si l'appelant parle
│   └── …
├── lib/
│   ├── twiml.js          ← Polly.Remi-Neural + pauses SSML
│   ├── llm.js
│   └── transfer.js       ← toujours null
```

Toute mise à jour de planning ou tarif : répercuter dans `config/kb.js` **et** `BOXPLUS/storefront/lib/bc-knowledge.js`.
