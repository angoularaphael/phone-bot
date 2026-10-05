'use strict';

/**
 * Messages vocaux — David, Boxing Center (brief coach : court, 3 options, raccroche).
 * Voix : Polly.Remi-Neural (homme, français)
 */

const RATE_FAST = process.env.BOT_SPEECH_RATE_FAST || '135%';
const RATE_OFFERS = process.env.BOT_SPEECH_RATE_OFFERS || '115%';
const RATE_DEFAULT = process.env.BOT_SPEECH_RATE || '125%';

const WELCOME =
    `Bonjour, je suis David de Boxing Center. ` +
    `Pour les inscriptions et offres d'abonnement, tapez 1. ` +
    `Pour les activités et plannings, tapez 2. ` +
    `Pour gérer, modifier ou résilier votre abonnement, tapez 3.`;

const MENU = WELCOME;

const MENU_REPEAT =
    `Je n'ai pas compris. ` + WELCOME;

const OPTION1_OFFERS =
    `Voici nos offres. ` +
    `Abonnement sans engagement : 29 euros toutes les 4 semaines, prélèvement tous les 28 jours. ` +
    `Offre annuelle : 259 euros pour 12 mois. ` +
    `L'inscription se fait en ligne sur la boutique Boxing Center. ` +
    `Séance d'essai adulte : 10 euros. Pour un enfant, l'essai est offert.`;

const OPTION1_ASK_SMS =
    `Souhaitez-vous recevoir le lien de la boutique Boxing Center par S.M.S. pour vous inscrire ? ` +
    `Tapez 1 pour oui, 2 pour non.`;

const OPTION1_SMS_YES =
    `Merci pour votre appel. Vous allez recevoir le lien par S.M.S. À bientôt chez Boxing Center.`;

const OPTION1_SMS_NO =
    `Très bien, merci pour votre appel. Vous pouvez retrouver nos offres directement sur la boutique Boxing Center. À bientôt.`;

const OPTION2_BODY =
    `Toutes les informations relatives aux activités, aux disciplines et aux plannings Boxing Center ` +
    `sont disponibles sur notre site internet : boxingcenter.fr. ` +
    `Souhaitez-vous recevoir le lien par S.M.S. ? Tapez 1 pour oui, 2 pour non.`;

const OPTION2_SMS_YES =
    `Merci, le lien va vous être envoyé par S.M.S. Bonne journée.`;

const OPTION2_SMS_NO =
    `Très bien, vous pouvez consulter toutes les informations sur boxingcenter.fr. Merci et bonne journée.`;

const OPTION3_BODY =
    `Vous pouvez gérer votre abonnement depuis la page Gérer mon abonnement, présente sur la boutique Boxing Center. ` +
    `Toutes les demandes relatives à la gestion, la modification ou la résiliation de votre abonnement ` +
    `se font uniquement depuis cette page. Merci et au revoir.`;

const BLOCKED_MSG =
    `Vous avez appelé plusieurs fois notre standard en peu de temps. ` +
    `Merci de consulter nos informations sur boxingcenter.fr ou sur la boutique Boxing Center. ` +
    `Vous pourrez rappeler ultérieurement.`;

const GOODBYE =
    `Merci d'avoir appelé Boxing Center. À bientôt.`;

const ASK_REPEAT = MENU_REPEAT;
const ASK_DTMF_HINT = MENU_REPEAT;
const NO_INPUT = `Je n'ai pas reçu de touche. `;
const THINKING = `Un instant.`;
const HUMAN_STEER = WELCOME;
const FOLLOW_UP = GOODBYE;
const FOLLOW_UP_REPEAT = GOODBYE;
const FOLLOW_UP_AFTER_SMS = GOODBYE;
const SUB_MENU = GOODBYE;
const SUB_MENU_INSCRIPTION = GOODBYE;
const SUB_MENU_RESIL = GOODBYE;
const OUTRO = GOODBYE;
const INTRO = WELCOME;
const MENU_CHOICES = WELCOME;

const PRATIQUE_MENU = OPTION2_BODY;
const PRATIQUE_MENU_REPEAT = OPTION2_BODY;
const SALLE_MENU = OPTION2_BODY;
const SALLE_MENU_REPEAT = OPTION2_BODY;

const ANSWERS = {
    inscription: OPTION1_OFFERS,
    administratif: OPTION3_BODY,
    infos_pratiques: OPTION2_BODY,
    planning: OPTION2_BODY,
    disciplines: OPTION2_BODY,
    autre: GOODBYE,
};

function getAnswer(motif) {
    return ANSWERS[motif] || GOODBYE;
}

function getFollowUp() {
    return '';
}

function isInscriptionMotif(motif) {
    return motif === 'inscription' || motif === 'tarifs' || motif === 'seance_essai';
}

function getCollectName() {
    return '';
}

const COLLECT_NAME = '';
const COLLECT_NAME_INSCRIPTION = '';
const COLLECT_NAME_RESIL = '';
const COLLECT_NAME_FALLBACK = '';
const COLLECT_PHONE = '';
const SMS_CONFIRM = () => OPTION1_SMS_YES;
const SMS_ALREADY_SENT = OPTION1_SMS_YES;
const SMS_FAILED = `Je n'ai pas réussi à envoyer le S.M.S. Merci de consulter la boutique Boxing Center.`;
const CALLBACK_CONFIRM = GOODBYE;
const TRANSFER_WAIT = WELCOME;
const TRANSFER_FAILED = GOODBYE;

const TRAIN_HUB =
    `Mode interne. Pour poser une question, appuyez sur 1. ` +
    `Pour enregistrer la réponse, appuyez sur 2. ` +
    `Pour quitter, appuyez sur étoile.`;
const TRAIN_ASK_Q = `Posez la question après le signal.`;
const TRAIN_ASK_R = `Donnez la réponse après le signal.`;
const TRAIN_NEED_Q = `Enregistrez d'abord la question. Appuyez sur 1.`;
const TRAIN_Q_OK = `Question notée. Appuyez sur 2 pour la réponse.`;
const TRAIN_SMS_OK = `Le S.M.S. est parti. Pour une autre paire, appuyez sur 1. Étoile pour le menu.`;
const TRAIN_SMS_FAIL = `Le S.M.S. n'est pas parti. Appuyez sur 2 pour réessayer, ou étoile pour quitter.`;
const TRAIN_MISS = `Je n'ai pas entendu. `;
const TRAIN_PHONE = `Tapez les 10 chiffres du mobile qui doit recevoir le S.M.S.`;

const ANSWER_ALIASES = {
    horaires: 'infos_pratiques',
    tarifs: 'inscription',
    activites: 'disciplines',
};

module.exports = {
    RATE_FAST,
    RATE_OFFERS,
    RATE_DEFAULT,
    WELCOME,
    INTRO,
    MENU_CHOICES,
    MENU,
    MENU_REPEAT,
    OPTION1_OFFERS,
    OPTION1_ASK_SMS,
    OPTION1_SMS_YES,
    OPTION1_SMS_NO,
    OPTION2_BODY,
    OPTION2_SMS_YES,
    OPTION2_SMS_NO,
    OPTION3_BODY,
    BLOCKED_MSG,
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
    isInscriptionMotif,
    HUMAN_STEER,
    SUB_MENU,
    SUB_MENU_INSCRIPTION,
    SUB_MENU_RESIL,
    THINKING,
    ANSWERS,
    getAnswer,
    ANSWER_ALIASES,
    COLLECT_NAME,
    COLLECT_NAME_INSCRIPTION,
    COLLECT_NAME_RESIL,
    getCollectName,
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
    TRAIN_HUB,
    TRAIN_ASK_Q,
    TRAIN_ASK_R,
    TRAIN_NEED_Q,
    TRAIN_Q_OK,
    TRAIN_SMS_OK,
    TRAIN_SMS_FAIL,
    TRAIN_MISS,
    TRAIN_PHONE,
};
