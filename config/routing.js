'use strict';

/**
 * Table de routage des motifs d'appel.
 *
 * Chaque entrée définit :
 *   digit      Touche du menu principal (1-9)
 *   label      Libellé affiché dans les rapports
 *   transfer   Numéro de renvoi vers un humain (null = pas de renvoi direct)
 *   smsLink    Lien URL envoyé dans le SMS (depuis les variables d'env)
 *   priority   'normal' | 'urgent'  (les urgents remontent en alerte)
 */

function routes() {
    return {
        horaires: {
            digit:    '1',
            label:    'Horaires et accès salle',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.LINK_HORAIRES        || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        tarifs: {
            digit:    '2',
            label:    'Tarifs et offres',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.LINK_TARIFS          || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        seance_essai: {
            digit:    '3',
            label:    "Séance d'essai",
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.LINK_ESSAI           || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        inscription: {
            digit:    '4',
            label:    'Inscription',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.LINK_INSCRIPTION     || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        planning: {
            digit:    '5',
            label:    'Planning des cours',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.LINK_PLANNING        || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        competition: {
            digit:    '6',
            label:    'Compétition',
            transfer: process.env.TRANSFER_COMPETITION || process.env.TRANSFER_ACCUEIL || null,
            smsLink:  process.env.LINK_COMPETITION     || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        administratif: {
            digit:    '7',
            label:    'Administratif / Facture',
            transfer: process.env.TRANSFER_ADMIN       || process.env.TRANSFER_ACCUEIL || null,
            smsLink:  process.env.BOXING_WEBSITE       || '',
            priority: 'urgent',
        },
        humain: {
            digit:    '8',
            label:    'Parler à un conseiller',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  null,
            priority: 'urgent',
        },
        autre: {
            digit:    '9',
            label:    'Autre demande',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.BOXING_WEBSITE       || '',
            priority: 'normal',
        },
    };
}

/**
 * Retourne le motif correspondant à une touche, ou null si inconnu.
 * @param {string} digit  Ex: '3'
 * @returns {string|null} Ex: 'seance_essai'
 */
function getMotifByDigit(digit) {
    if (!digit) return null;
    const all = routes();
    const found = Object.entries(all).find(([, r]) => r.digit === digit);
    return found ? found[0] : null;
}

module.exports = { routes, getMotifByDigit };
