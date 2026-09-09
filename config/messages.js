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
    `Pour tout autre motif, appuyez sur la touche 4. ` +
    `Vous pouvez aussi me poser votre question.`;

const MENU = WELCOME;

const MENU_REPEAT =
    `Je n'ai pas compris. Posez votre question, ou choisissez une touche. ` + WELCOME;

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
    `Je n'ai pas bien entendu. Posez votre question, ou appuyez sur une touche.`;

const ASK_DTMF_HINT = MENU_REPEAT;

const SUB_MENU =
    `Si vous voulez recevoir un S.M.S. avec les informations et les liens utiles, appuyez sur la touche 1. ` +
    `Si vous préférez que l'on vous rappelle, appuyez sur la touche 2. ` +
    `Pour revenir au menu principal, appuyez sur étoile. ` +
    `Vous pouvez aussi me poser une autre question.`;

const SUB_MENU_INSCRIPTION =
    `Si vous voulez recevoir un S.M.S. avec les liens pour vous inscrire, appuyez sur la touche 1. ` +
    `Pour revenir au menu principal, appuyez sur étoile. ` +
    `Vous pouvez aussi me poser une autre question.`;

const FOLLOW_UP_AFTER_SMS =
    `Vous pouvez me poser une autre question. ` +
    `Pour revenir au menu principal, appuyez sur étoile.`;

const FOLLOW_UP = SUB_MENU;

const FOLLOW_UP_REPEAT = SUB_MENU;

function isInscriptionMotif(motif) {
    return motif === 'inscription' || motif === 'tarifs' || motif === 'seance_essai';
}

function offersCallback({ motif, smsSent } = {}) {
    if (smsSent) return false;
    if (isInscriptionMotif(motif)) return false;
    return true;
}

function getFollowUp({ motif, smsSent } = {}) {
    if (smsSent) return FOLLOW_UP_AFTER_SMS;
    if (isInscriptionMotif(motif)) return SUB_MENU_INSCRIPTION;
    return SUB_MENU;
}

const HUMAN_STEER =
    `Je peux vous répondre. ` + WELCOME;

const ANSWERS = {
    infos_pratiques:
        `Ouvert du lundi au samedi, de 10 heures à 21 heures 30. ` +
        `Fermé le dimanche. ` +
        `Cinq salles à Toulouse et Portet.`,

    inscription:
        `Voici nos formules. ` +
        `Vous pouvez vous abonner sans engagement pour 29 euros toutes les 4 semaines. ` +
        `Le prélèvement n'est pas mensuel : il a lieu tous les 28 jours, et vous pouvez arrêter à tout moment. ` +
        `Si vous venez toute l'année, l'offre à 259 euros pour 12 mois est plus avantageuse. ` +
        `L'inscription se fait en ligne, en quelques minutes. ` +
        `Si vous préférez d'abord découvrir la salle, une séance d'essai est possible à 10 euros, à réserver sur internet.`,

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
        `Pour un abonnement sans engagement, la résiliation se fait uniquement en ligne. ` +
        `Allez sur Gérer mon abonnement, puis Résilier. ` +
        `Il faut le faire plus de 72 heures avant le prochain prélèvement. ` +
        `La facture et le contrat se trouvent dans le même espace en ligne.`,

    autre:
        `Dites-moi votre question, je vous écoute.`,
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
    `Très bien. Je vais vous envoyer un S.M.S. avec les informations. ` +
    `Dites votre prénom après le signal, pour que le message soit à votre nom.`;

const COLLECT_NAME_FALLBACK =
    `Je n'ai pas bien entendu. Dites seulement votre prénom après le signal.`;

const COLLECT_PHONE =
    `Sur quel numéro souhaitez-vous recevoir le S.M.S. ? Tapez les 10 chiffres de votre téléphone.`;

const SMS_CONFIRM =
    (name) => `C'est envoyé${name ? `, ${name}` : ''}. Vous allez le recevoir dans quelques instants.`;

const SMS_ALREADY_SENT =
    `Le S.M.S. a déjà été envoyé. Vous n'avez rien à faire de plus de ce côté.`;

const SMS_FAILED =
    `Je n'ai pas réussi à envoyer le S.M.S. Vous pouvez réessayer en appuyant sur la touche 1.`;

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
    FOLLOW_UP_AFTER_SMS,
    getFollowUp,
    offersCallback,
    isInscriptionMotif,
    HUMAN_STEER,
    SUB_MENU,
    SUB_MENU_INSCRIPTION,
    ANSWERS,
    getAnswer,
    ANSWER_ALIASES,
    COLLECT_NAME,
    COLLECT_NAME_FALLBACK,
    COLLECT_PHONE,
    SMS_CONFIRM,
    SMS_ALREADY_SENT,
    SMS_FAILED,
    CALLBACK_CONFIRM,
    TRANSFER_WAIT,
    TRANSFER_FAILED,
    GOODBYE,
    OUTRO,
    NO_INPUT,
};
