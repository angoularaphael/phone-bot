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

// ─── Menu principal ──────────────────────────────────────────────────────────

const MENU =
    `Pour vous orienter, veuillez choisir parmi les options suivantes. ` +
    `Pour les horaires et l'accès à la salle, appuyez sur 1. ` +
    `Pour les tarifs et nos offres, appuyez sur 2. ` +
    `Pour réserver une séance d'essai gratuite, appuyez sur 3. ` +
    `Pour vous inscrire, appuyez sur 4. ` +
    `Pour consulter le planning des cours, appuyez sur 5. ` +
    `Pour la compétition, appuyez sur 6. ` +
    `Pour un problème administratif ou une demande de facture, appuyez sur 7. ` +
    `Pour parler directement à un conseiller, appuyez sur 8. ` +
    `Pour toute autre demande, appuyez sur 9.`;

const MENU_REPEAT =
    `Je n'ai pas saisi votre choix. ` + MENU;

// ─── Sous-menu après chaque réponse ──────────────────────────────────────────

const SUB_MENU =
    `Pour recevoir ces informations par S.M.S., appuyez sur 1. ` +
    `Pour les recevoir sur WhatsApp, appuyez sur 2. ` +
    `Pour demander un rappel, appuyez sur 3. ` +
    `Pour parler à un conseiller, appuyez sur 4. ` +
    `Pour revenir au menu principal, appuyez sur étoile.`;

// ─── Réponses par motif ───────────────────────────────────────────────────────

const ANSWERS = {

    horaires:
        `Nos salles sont ouvertes du lundi au vendredi de 9 heures à 21 heures 30, ` +
        `le samedi de 9 heures à 18 heures, et le dimanche de 9 heures à 13 heures. ` +
        `En période estivale, des horaires aménagés peuvent s'appliquer. ` +
        `Retrouvez l'adresse et le plan d'accès sur notre site internet. `,

    tarifs:
        `Nos abonnements adultes débutent à 45 euros par mois. ` +
        `Des formules trimestrielles et annuelles sont disponibles avec des tarifs avantageux. ` +
        `Des réductions sont accordées pour les enfants, les étudiants et les familles. ` +
        `En ce moment, nous proposons une offre été et une offre rentrée exceptionnelles. `,

    seance_essai:
        `Bonne nouvelle ! Nous proposons une séance d'essai entièrement gratuite et sans engagement ` +
        `pour découvrir nos cours de boxe anglaise, kick-boxing et fitness combat. ` +
        `Tous les niveaux sont acceptés, du grand débutant au sportif confirmé. ` +
        `Présentez-vous directement à l'accueil ou réservez votre créneau en ligne. `,

    inscription:
        `Pour vous inscrire chez Boxing Center, rendez-vous à l'accueil de la salle ` +
        `avec une pièce d'identité et un justificatif de domicile. ` +
        `L'inscription est possible du lundi au samedi aux horaires d'ouverture. ` +
        `Je peux vous envoyer le lien d'inscription en ligne par S.M.S. si vous le souhaitez. `,

    planning:
        `Nous proposons plus de 30 créneaux de cours par semaine, ` +
        `incluant la boxe anglaise, le kick-boxing, la savate, ` +
        `le fitness combat et des cours spécifiques enfants et adolescents. ` +
        `Les cours enfants ont lieu le mercredi après-midi et le samedi matin. ` +
        `Je vous envoie le planning complet par S.M.S. si vous le souhaitez. `,

    competition:
        `Boxing Center dispose d'une équipe compétition active. ` +
        `Nous participons aux galeas régionaux et aux championnats nationaux. ` +
        `Pour intégrer l'équipe, il faut généralement suivre des cours réguliers pendant au moins 3 mois. ` +
        `Notre responsable compétition peut vous donner toutes les informations nécessaires. `,

    administratif:
        `Pour toute question administrative, résiliation, modification de contrat ou demande de facture, ` +
        `notre équipe est disponible du lundi au vendredi de 9 heures à 17 heures. ` +
        `Vous pouvez également accéder à vos documents depuis votre espace membre sur notre site internet. `,

    autre:
        `Pour toute demande qui ne figure pas dans notre menu, ` +
        `nos conseillers sont là pour vous aider. `,
};

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
