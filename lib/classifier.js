'use strict';

/**
 * Classification des motifs d'appel à partir de la reconnaissance vocale.
 * Même logique de mots-clés pondérés que le mail-bot.
 */

const CATEGORIES = [
    {
        id: 'horaires',
        label: 'Horaires et accès salle',
        priority: 1,
        keywords: [
            'horaire', 'heure', 'ouverture', 'fermeture', 'quand êtes-vous ouverts',
            'accès', 'adresse', 'localisation', 'comment venir', 'parking', 'plan',
            'ouvert', 'fermé', 'salle ouverte', 'où se trouve',
        ],
    },
    {
        id: 'tarifs',
        label: 'Tarifs et offres',
        priority: 1,
        keywords: [
            'tarif', 'prix', 'coût', 'combien', 'formule', 'offre', 'forfait',
            'mensuel', 'abonnement', 'cotisation', 'renseignement', 'grille',
            'offre été', 'offre rentrée', 'promotion', 'réduction',
        ],
    },
    {
        id: 'seance_essai',
        label: "Séance d'essai",
        priority: 2,
        keywords: [
            'essai', 'découverte', 'essayer', 'tester', 'gratuit',
            'première séance', 'séance découverte', 'sans engagement', 'initiation',
            'venir essayer', 'voir si', 'avant de m\'inscrire',
        ],
    },
    {
        id: 'inscription',
        label: 'Inscription',
        priority: 2,
        keywords: [
            'inscrire', 'inscription', 'adhésion', 'rejoindre', 'membre',
            'adhérer', 'rejoindre le club', 'comment je fais pour', 'je voudrais m\'inscrire',
        ],
    },
    {
        id: 'planning',
        label: 'Planning des cours',
        priority: 1,
        keywords: [
            'planning', 'programme', 'cours', 'créneau', 'emploi du temps',
            'calendrier', 'séance', 'entraînement', 'quels cours',
        ],
    },
    {
        id: 'competition',
        label: 'Compétition',
        priority: 2,
        keywords: [
            'compétition', 'combat', 'tournoi', 'championnat', 'gala',
            'fight', 'match', 'équipe compétition', 'licence compétition',
            'combattre', 'passer en compétition',
        ],
    },
    {
        id: 'administratif',
        label: 'Problème administratif / Facture',
        priority: 3,
        keywords: [
            'facture', 'reçu', 'justificatif', 'remboursement', 'résiliation',
            'annulation', 'administratif', 'contrat', 'litige', 'réclamation',
            'problème', 'erreur', 'prélèvement', 'attestation',
        ],
    },
];

function normalize(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['']/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Tente de classifier un résultat vocal en un motif d'appel.
 *
 * @param {string} speechResult  Texte issu de la reconnaissance vocale Twilio
 * @returns {{ motif: string, label: string, confidence: number }}
 */
function classify(speechResult) {
    const text   = normalize(speechResult || '');
    const scores = {};

    for (const cat of CATEGORIES) {
        let score = 0;
        for (const kw of cat.keywords) {
            if (text.includes(normalize(kw))) score += cat.priority;
        }
        if (score > 0) scores[cat.id] = score;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
        return { motif: 'autre', label: 'Autre', confidence: 0 };
    }

    const [topId, topScore] = sorted[0];
    const topCat = CATEGORIES.find(c => c.id === topId);
    return {
        motif:      topId,
        label:      topCat?.label || 'Autre',
        confidence: topScore,
    };
}

module.exports = { classify, CATEGORIES };
