'use strict';

/**
 * Messages vocaux — David, Boxing Center
 * Voix : Polly.Remi-Neural (homme, français)
 *
 * Phrases courtes. Points pour les pauses TTS.
 * 29 euros toutes les 4 semaines : jamais « par mois ».
 */

const WELCOME =
    `Boxing Center, bonjour, c'est David. ` +
    `Vous souhaitez vous inscrire, obtenir des informations sur nos formules et tarifs : appuyez sur la touche 1. ` +
    `Vous souhaitez obtenir des informations sur les plannings, les horaires d'ouverture, les activités et les disciplines enseignées chez Boxing Center : appuyez sur la touche 2. ` +
    `Vous souhaitez gérer votre abonnement ou obtenir des informations à son sujet : appuyez sur la touche 3. ` +
    `Pour tout autre motif, appuyez sur la touche 4.`;

const MENU = WELCOME;

const MENU_REPEAT =
    `Je n'ai pas saisi votre choix. ` + WELCOME;

const PRATIQUE_MENU =
    `Pour les horaires d'ouverture, appuyez sur 1. ` +
    `Pour le planning des cours, appuyez sur 2. ` +
    `Pour les activités et disciplines, appuyez sur 3. ` +
    `Retour au menu, étoile.`;

const PRATIQUE_MENU_REPEAT =
    `Je n'ai pas saisi. ` + PRATIQUE_MENU;

const SALLE_MENU =
    `Quelle salle ? ` +
    `Appuyez sur 1 pour Minimes. ` +
    `2 pour Portet. ` +
    `3 pour Ramonville. ` +
    `4 pour Saint-Cyprien. ` +
    `5 pour États-Unis.`;

const SALLE_MENU_REPEAT =
    `Je n'ai pas saisi. ` + SALLE_MENU;

const ASK_REPEAT =
    `Je n'ai pas bien entendu. Appuyez sur une touche du menu.`;

const ASK_DTMF_HINT = MENU_REPEAT;

const SUB_MENU =
    `Pour un S.M.S., appuyez sur 1. ` +
    `Un rappel, 2. ` +
    `Retour au menu, étoile.`;

const FOLLOW_UP = SUB_MENU;

const FOLLOW_UP_REPEAT = SUB_MENU;

const HUMAN_STEER =
    `Je peux vous répondre. ` + WELCOME;

const ANSWERS = {
    infos_pratiques:
        `Ouvert du lundi au samedi, de 10 heures à 21 heures 30. ` +
        `Fermé le dimanche. ` +
        `Cinq salles à Toulouse et Portet.`,

    inscription:
        `Offre en cours : 29 euros toutes les 4 semaines, sans engagement. ` +
        `Ce n'est pas un prélèvement mensuel. C'est tous les 28 jours. ` +
        `L'année complète : 259 euros. ` +
        `Essai : 10 euros, réservable en ligne.`,

    planning:
        `Pour le planning, choisissez d'abord la salle.`,

    disciplines:
        `Boxe anglaise, pieds-poings, MMA, grappling, fitness. ` +
        `Cours femmes et enfants, selon la salle. ` +
        `Pour les horaires précis, prenez le planning.`,

    competition:
        `Les cours compétiteurs sont réservés aux confirmés. ` +
        `Pour découvrir, prenez un cours loisirs, tous niveaux.`,

    administratif:
        `Pour un sans engagement, c'est uniquement en ligne. ` +
        `Gérer mon abonnement, puis Résilier. ` +
        `Plus de 72 heures avant le prélèvement. ` +
        `Facture et contrat : même espace en ligne. ` +
        `Je peux vous envoyer le lien par S.M.S.`,

    autre:
        `Dites votre question. ` +
        `Sinon je peux envoyer un S.M.S., ou on vous rappelle.`,
};

const ANSWER_ALIASES = {
    horaires:     'infos_pratiques',
    tarifs:       'inscription',
    seance_essai: 'inscription',
    activites:    'disciplines',
};

function getAnswer(motif) {
    const key = ANSWER_ALIASES[motif] || motif;
    return ANSWERS[key] || ANSWERS.autre;
}

const COLLECT_NAME =
    `Pour le S.M.S., dites votre prénom après le signal.`;

const COLLECT_NAME_FALLBACK =
    `Je n'ai pas bien entendu. Dites votre prénom après le signal.`;

const COLLECT_PHONE =
    `Sur quel numéro ? Tapez vos 10 chiffres.`;

const SMS_CONFIRM =
    (name) => `C'est envoyé${name ? `, ${name}` : ''}.`;

const CALLBACK_CONFIRM =
    `C'est noté. On vous rappelle du lundi au samedi.`;

const TRANSFER_WAIT = HUMAN_STEER;

const TRANSFER_FAILED =
    `Je reste avec vous. Appuyez sur une touche du menu.`;

const GOODBYE =
    `Merci d'avoir appelé Boxing Center. À bientôt.`;

const OUTRO = SUB_MENU;

const NO_INPUT =
    `Je n'ai pas reçu de touche. `;

module.exports = {
    WELCOME,
    MENU,
    MENU_REPEAT,
    PRATIQUE_MENU,
    PRATIQUE_MENU_REPEAT,
    SALLE_MENU,
    SALLE_MENU_REPEAT,
    ASK_REPEAT,
    ASK_DTMF_HINT,
    FOLLOW_UP,
    FOLLOW_UP_REPEAT,
    HUMAN_STEER,
    SUB_MENU,
    ANSWERS,
    getAnswer,
    ANSWER_ALIASES,
    COLLECT_NAME,
    COLLECT_NAME_FALLBACK,
    COLLECT_PHONE,
    SMS_CONFIRM,
    CALLBACK_CONFIRM,
    TRANSFER_WAIT,
    TRANSFER_FAILED,
    GOODBYE,
    OUTRO,
    NO_INPUT,
};
