'use strict';

/**
 * Table de routage des motifs d'appel.
 *
 * Menu principal : 5 touches (fusion des anciennes options 1-9).
 *
 * Chaque entrée définit :
 *   digit      Touche du menu principal (1-5)
 *   label      Libellé affiché dans les rapports
 *   transfer   Numéro de renvoi vers un humain (null = pas de renvoi direct)
 *   smsLink    Lien URL envoyé dans le SMS (depuis les variables d'env)
 *   priority   'normal' | 'urgent'  (les urgents remontent en alerte)
 */

function routes() {
    return {
        infos_pratiques: {
            digit:    '1',
            label:    'Horaires et planning',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.LINK_HORAIRES        || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        inscription: {
            digit:    '2',
            label:    'Tarifs, essai et inscription',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  process.env.LINK_ESSAI           || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        competition: {
            digit:    '3',
            label:    'Compétition',
            transfer: process.env.TRANSFER_COMPETITION || process.env.TRANSFER_ACCUEIL || null,
            smsLink:  process.env.LINK_COMPETITION     || process.env.BOXING_WEBSITE || '',
            priority: 'normal',
        },
        administratif: {
            digit:    '4',
            label:    'Administratif / Facture',
            transfer: process.env.TRANSFER_ADMIN       || process.env.TRANSFER_ACCUEIL || null,
            smsLink:  process.env.BOXING_WEBSITE       || '',
            priority: 'urgent',
        },
        humain: {
            digit:    '5',
            label:    'Parler à un conseiller',
            transfer: process.env.TRANSFER_ACCUEIL     || null,
            smsLink:  null,
            priority: 'urgent',
        },
    };
}

/**
 * Retourne le motif correspondant à une touche, ou null si inconnu.
 * @param {string} digit  Ex: '2'
 * @returns {string|null} Ex: 'inscription'
 */
function getMotifByDigit(digit) {
    if (!digit) return null;
    const all = routes();
    const found = Object.entries(all).find(([, r]) => r.digit === digit);
    return found ? found[0] : null;
}

/** Anciens motifs → routes fusionnées */
const ROUTE_ALIASES = {
    horaires:     'infos_pratiques',
    planning:     'infos_pratiques',
    tarifs:       'inscription',
    seance_essai: 'inscription',
    autre:        'humain',
};

function getRoute(motif) {
    const key = ROUTE_ALIASES[motif] || motif;
    return routes()[key] || routes().humain;
}

module.exports = { routes, getMotifByDigit, getRoute, ROUTE_ALIASES };
