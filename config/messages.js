'use strict';

/**
 * Messages vocaux du bot téléphonique — Boxing Center
 * Langue : français | Voix : Polly.Lea-Neural
 *
 * Convention TTS :
 *   - Virgules et points pour les pauses
 *   - Pas d'abréviations (« euros », « S.M.S. »)
 *   - Jamais « par mois » pour l'offre 29 euros (prélèvement toutes les 4 semaines)
 */

const WELCOME =
    `Bonjour, Boxing Center. Je suis l'assistante vocale. ` +
    `Posez votre question : planning, tarifs, essai, résiliation. ` +
    `Vous pouvez aussi appuyer sur 1 pour les horaires, 2 pour les tarifs, ` +
    `3 pour le planning, 4 pour une question administrative.`;

const MENU = WELCOME;

const MENU_REPEAT =
    `Je n'ai pas saisi. ` + WELCOME;

const ASK_REPEAT =
    `Je n'ai pas bien entendu. Posez votre question après le signal, ` +
    `ou appuyez sur une touche.`;

const ASK_DTMF_HINT =
    `Dites votre question, ou appuyez sur 1 pour les horaires, ` +
    `2 pour les tarifs, 3 pour le planning, ` +
    `4 pour une résiliation ou une facture.`;

const FOLLOW_UP =
    `Autre question ? Appuyez sur 1 pour recevoir les liens par S.M.S., ` +
    `sur 2 pour WhatsApp, sur 3 pour un rappel. Pour terminer, dites au revoir.`;

const FOLLOW_UP_REPEAT =
    `Souhaitez-vous autre chose ? Dites votre question, ` +
    `ou appuyez sur 1 pour un S.M.S., 2 pour WhatsApp, 3 pour un rappel.`;

const HUMAN_STEER =
    `Je peux vous répondre maintenant. Quelle est votre question : ` +
    `planning, tarifs, essai, résiliation ?`;

const SUB_MENU = FOLLOW_UP;

const ANSWERS = {
    infos_pratiques:
        `Nos cinq salles sont ouvertes du lundi au samedi, de 10 heures à 21 heures 30. ` +
        `Le dimanche, elles sont fermées. ` +
        `Dites-moi quelle salle vous intéresse pour le planning des cours : ` +
        `Minimes, Portet, Ramonville, Saint-Cyprien ou États-Unis.`,

    inscription:
        `L'offre en cours est à 29 euros toutes les 4 semaines, sans engagement, ` +
        `soit tous les 28 jours, ce n'est pas un prélèvement mensuel. ` +
        `Pour l'année, 259 euros les 12 mois, c'est le plus avantageux si vous pratiquez sur la saison. ` +
        `L'inscription se fait en ligne sur la boutique. ` +
        `La séance d'essai est à 10 euros si vous préférez tester avant.`,

    competition:
        `Boxing Center a un pôle compétition. ` +
        `Les cours indiqués compétiteurs sont réservés aux pratiquants confirmés, ` +
        `ce n'est pas une découverte. ` +
        `Pour commencer, un cours loisirs tous niveaux convient mieux. ` +
        `Dans quelle salle souhaitez-vous vous entraîner ?`,

    administratif:
        `Pour résilier un abonnement sans engagement, c'est uniquement en ligne : ` +
        `Gérer mon abonnement, puis Résilier mon abonnement. ` +
        `Une demande orale ne suffit pas. ` +
        `Enregistrez la demande plus de 72 heures avant le prochain prélèvement. ` +
        `Je peux vous envoyer le lien par S.M.S.`,

    autre:
        `Je peux vous renseigner sur les salles, les cours, les tarifs, l'essai ou la résiliation. ` +
        `Quelle est votre question ?`,
};

const ANSWER_ALIASES = {
    horaires:     'infos_pratiques',
    planning:     'infos_pratiques',
    tarifs:       'inscription',
    seance_essai: 'inscription',
};

function getAnswer(motif) {
    const key = ANSWER_ALIASES[motif] || motif;
    return ANSWERS[key] || ANSWERS.autre;
}

const COLLECT_NAME =
    `Pour vous envoyer les informations par S.M.S., j'ai besoin de votre prénom. ` +
    `Dites votre prénom après le signal.`;

const COLLECT_NAME_FALLBACK =
    `Je n'ai pas bien entendu. Dites votre prénom clairement après le signal.`;

const COLLECT_PHONE =
    `Merci ! Sur quel numéro souhaitez-vous recevoir le S.M.S. ? ` +
    `Saisissez votre numéro de téléphone à 10 chiffres sur le clavier.`;

const SMS_CONFIRM =
    (name) => `Parfait${name ? `, ${name}` : ''} ! ` +
        `Nous vous envoyons les informations par S.M.S. dans quelques instants.`;

const WHATSAPP_CONFIRM =
    (name) => `Parfait${name ? `, ${name}` : ''} ! ` +
        `Nous vous envoyons les informations sur WhatsApp dans quelques instants.`;

const COLLECT_NAME_WA =
    `Pour vous envoyer les informations sur WhatsApp, j'ai besoin de votre prénom. ` +
    `Dites votre prénom après le signal.`;

const COLLECT_PHONE_WA =
    `Merci ! Sur quel numéro WhatsApp souhaitez-vous recevoir le message ? ` +
    `Saisissez votre numéro de téléphone à 10 chiffres sur le clavier.`;

const CALLBACK_CONFIRM =
    `Votre demande de rappel a bien été enregistrée. ` +
    `Nous vous recontacterons dans les meilleurs délais, ` +
    `du lundi au samedi.`;

const TRANSFER_WAIT = HUMAN_STEER;

const TRANSFER_FAILED =
    `Je reste avec vous au téléphone. Posez votre question, je peux y répondre.`;

const GOODBYE =
    `Merci d'avoir appelé Boxing Center. ` +
    `Nous espérons vous accueillir bientôt dans nos salles. ` +
    `Bonne journée.`;

const OUTRO = FOLLOW_UP;

const NO_INPUT =
    `Je n'ai pas reçu de réponse. `;

module.exports = {
    WELCOME,
    MENU,
    MENU_REPEAT,
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
    WHATSAPP_CONFIRM,
    COLLECT_NAME_WA,
    COLLECT_PHONE_WA,
    CALLBACK_CONFIRM,
    TRANSFER_WAIT,
    TRANSFER_FAILED,
    GOODBYE,
    OUTRO,
    NO_INPUT,
};
