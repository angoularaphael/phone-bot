# Boxing Center — Phone Bot

Bot téléphonique de la ligne principale Boxing Center (09 39 03 67 48).
Gère les appels via **Twilio** : conversation vocale (Polly Lea + Groq), SMS / WhatsApp, demande de rappel.

**Aucun transfert vers un humain.** Le bot répond lui-même (planning, tarifs, essai, résiliation, salles).

---

## Fonctionnalités

| Feature | Détail |
|---|---|
| Accueil vocal | Invitation à poser une question (parole) |
| Conversation | STT Twilio + Groq (faits de `config/kb.js`) + TTS Polly |
| Touches de secours | 1 horaires · 2 tarifs · 3 planning · 4 administratif |
| Envoi SMS / WhatsApp | Liens boutique, Gérer mon abo, essai |
| Demande de rappel | Enregistrée en base (pas un transfert live) |
| Supabase | Historique d'appels |

---

## Parcours d'appel

```
Appel entrant
  └─ Accueil : « Posez votre question »
       ├─ Parole → réponse IA (base Boxing Center) → autre question ?
       ├─ Touche 1-4 → même cerveau, question synthétique
       └─ Après une réponse :
            1 SMS · 2 WhatsApp · 3 rappel · parole = suite
```

Pas de touche « conseiller ». Si l'appelant demande à parler à quelqu'un, le bot traite la demande.

Faits de référence (alignés sur la boutique, 24/08/2026) :

- Ouverture : lundi–samedi 10h–21h30. Dimanche fermé.
- Offre : 29 € toutes les 4 semaines (28 jours, jamais « par mois ») · 259 € / 12 mois.
- Essai : 10 € (après les offres d'abonnement).
- Résiliation sans engagement : uniquement en ligne (Gérer mon abonnement).

---

## Installation

```bash
cd phone-bot
npm install
cp .env.example .env
```

### Prérequis

1. Compte Twilio (voix + SMS)
2. Clé Groq (`GROQ_API_KEY`, préfixe `gsk_`) — relais Gemini / Mistral possibles
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
| `TWILIO_*` | Compte et numéro Twilio |
| `GROQ_API_KEY` | Clé Groq (conversation) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Historique appels |
| `LINK_GERER_ABO` | Lien SMS résiliation |
| `BOT_DRY_RUN` | `true` = pas de SMS réel |
| `USE_AI_REPLY` | `false` = textes figés uniquement |

`TRANSFER_ACCUEIL` / `_ADMIN` / `_COMPETITION` peuvent rester dans le `.env` : elles **ne sont plus lues**.

---

## Structure

```
phone-bot/
├── index.js
├── config/
│   ├── kb.js             ← faits (copie de bc-knowledge.js)
│   ├── voice-prompt.js   ← règles téléphone (jamais transférer)
│   ├── messages.js       ← TTS accueil / secours
│   └── routing.js
├── flows/
│   ├── welcome.js
│   ├── converse.js       ← boucle vocale
│   ├── human.js          ← redirige vers converse (plus de Dial)
│   └── …
├── lib/
│   ├── llm.js
│   ├── session.js
│   ├── classifier.js     ← secours si Groq down
│   └── transfer.js       ← toujours null
```

Toute mise à jour de planning ou tarif : répercuter dans `config/kb.js` **et** `BOXPLUS/storefront/lib/bc-knowledge.js`.
