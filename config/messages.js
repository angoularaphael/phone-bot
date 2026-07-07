'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 * Messages vocaux du bot téléphonique — Boxing Center
 * Langue : français | Voix : Polly.Lea-Neural
 * ═══════════════════════════════════════════════════════════════
 *
 * Convention d'écriture pour le TTS :
 *   - Virgules et points pour les pauses naturelles
 *   - Pas d'abréviations (écrire "euros" et non "€", "S.M.S." pour SMS)
 *   - Chiffres en toutes lettres si besoin de clarté
 */

// ─── Accueil ──────────────────────────────────────────────────────────────────

const WELCOME =
    `Bonjour et bienvenue chez Boxing Center, ` +
    `votre salle de boxe anglaise et kick-boxing. `;

// ─── Menu principal (5 options) ────────────────────────────────────────────────

const MENU =
    `Pour vous orienter, écoutez les options suivantes. ` +
    `Pour les horaires, l'accès à la salle et le planning des cours, appuyez sur 1. ` +
    `Pour les tarifs, réserver une séance d'essai gratuite ou vous inscrire, appuyez sur 2. ` +
    `Pour la compétition, appuyez sur 3. ` +
    `Pour une question administrative, une résiliation ou une facture, appuyez sur 4. ` +
    `Pour parler directement à un conseiller, appuyez sur 5.`;

const MENU_REPEAT =
    `Je n'ai pas saisi votre choix. ` + MENU;

// ─── Sous-menu après chaque réponse ──────────────────────────────────────────

const SUB_MENU =
    `Que souhaitez-vous faire ensuite ? ` +
    `Pour recevoir ces informations par S.M.S. sur votre mobile, appuyez sur 1. ` +
    `Pour les recevoir sur WhatsApp, appuyez sur 2. ` +
    `Pour être rappelé par un conseiller, appuyez sur 3. ` +
    `Pour parler à un conseiller maintenant, appuyez sur 4. ` +
    `Pour revenir au menu principal, appuyez sur étoile.`;

// ─── Réponses par motif ───────────────────────────────────────────────────────

const ANSWERS = {

    // Fusion horaires + planning (touche 1)
    infos_pratiques:
        `Nos salles sont ouvertes du lundi au vendredi de 9 heures à 21 heures 30, ` +
        `le samedi de 9 heures à 18 heures, et le dimanche de 9 heures à 13 heures. ` +
        `Nous proposons plus de 30 cours par semaine : boxe anglaise, kick-boxing, savate et fitness combat. ` +
        `L'adresse et le planning complet sont disponibles sur notre site internet. `,

    // Fusion tarifs + essai + inscription (touche 2)
    inscription:
        `Nos abonnements adultes débutent à 45 euros par mois, ` +
        `avec des tarifs réduits pour les enfants et les étudiants. ` +
        `La séance d'essai est gratuite et sans engagement, tous niveaux acceptés. ` +
        `Pour vous inscrire, présentez-vous à l'accueil avec une pièce d'identité, ou inscrivez-vous en ligne. `,

    competition:
        `Boxing Center dispose d'une équipe compétition active, ` +
        `présente aux galeas régionaux et aux championnats nationaux. ` +
        `L'intégration se fait généralement après 3 mois de cours réguliers. `,

    administratif:
        `Pour toute question administrative, résiliation, modification de contrat ou demande de facture, ` +
        `notre équipe est disponible du lundi au vendredi de 9 heures à 17 heures. ` +
        `Vos documents sont aussi accessibles sur votre espace membre en ligne. `,

    autre:
        `Nos conseillers répondront à votre demande. `,
};

/** Anciens motifs → nouveaux (rétrocompatibilité) */
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

// ─── Collecte des coordonnées ─────────────────────────────────────────────────

const COLLECT_NAME =
    `Pour vous envoyer les informations par S.M.S., j'ai besoin de votre prénom. ` +
    `Dites votre prénom après le signal.`;

const COLLECT_NAME_FALLBACK =
    `Je n'ai pas bien entendu. Dites votre prénom clairement après le signal.`;

const COLLECT_PHONE =
    `Merci ! Sur quel numéro souhaitez-vous recevoir le S.M.S. ? ` +
    `Saisissez votre numéro de téléphone à 10 chiffres sur le clavier.`;

// ─── Confirmations ───────────────────────────────────────────────────────────

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
    `Un de nos conseillers vous contactera dans les meilleurs délais, ` +
    `aux horaires d'ouverture du lundi au samedi.`;

const TRANSFER_WAIT =
    `Je vous mets en relation avec un conseiller Boxing Center. ` +
    `Veuillez patienter quelques instants.`;

const TRANSFER_FAILED =
    `Nos conseillers ne sont pas disponibles pour le moment. ` +
    `Vous pouvez laisser un message après le signal, ` +
    `et nous vous rappellerons dès que possible.`;

// ─── Au revoir ────────────────────────────────────────────────────────────────

const GOODBYE =
    `Merci d'avoir appelé Boxing Center. ` +
    `Nous espérons vous accueillir très bientôt dans nos salles. ` +
    `Bonne journée et à très bientôt !`;

const OUTRO =
    `Pour revenir au menu principal, appuyez sur étoile. ` +
    `Pour terminer l'appel, raccrochez.`;

const NO_INPUT =
    `Je n'ai pas reçu de réponse. Revenons au menu principal. `;

module.exports = {
    WELCOME,
    MENU,
    MENU_REPEAT,
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
