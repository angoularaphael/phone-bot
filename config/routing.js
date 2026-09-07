'use strict';

/**
 * Table de routage des motifs d'appel.
 * Plus aucun transfert humain : les numéros TRANSFER_* ne sont pas lus.
 *
 * Touches de secours (si la parole n'est pas comprise) :
 *   1 horaires  2 tarifs/essai  3 planning  4 administratif
 */

function routes() {
    const site = process.env.BOXING_WEBSITE || 'https://boxingcenter.fr';
    const boutique = process.env.LINK_BOUTIQUE || 'https://boutique.boxingcenter.fr';
    return {
        infos_pratiques: {
            digit:    '1',
            label:    'Horaires et planning',
            transfer: null,
            smsLink:  process.env.LINK_HORAIRES || site,
            priority: 'normal',
        },
        inscription: {
            digit:    '2',
            label:    'Tarifs, essai et inscription',
            transfer: null,
            smsLink:  process.env.LINK_ESSAI || boutique,
            priority: 'normal',
        },
        planning: {
            digit:    '3',
            label:    'Planning des cours',
            transfer: null,
            smsLink:  process.env.LINK_PLANNING || site,
            priority: 'normal',
        },
        administratif: {
            digit:    '4',
            label:    'Administratif / Facture',
            transfer: null,
            smsLink:  process.env.LINK_GERER_ABO || `${boutique.replace(/\/$/, '')}/gerer-abonnement`,
            priority: 'urgent',
        },
        competition: {
            digit:    null,
            label:    'Compétition',
            transfer: null,
            smsLink:  process.env.LINK_COMPETITION || site,
            priority: 'normal',
        },
    };
}

function getMotifByDigit(digit) {
    if (!digit) return null;
    const all = routes();
    const found = Object.entries(all).find(([, r]) => r.digit === digit);
    return found ? found[0] : null;
}

const ROUTE_ALIASES = {
    horaires:     'infos_pratiques',
    tarifs:       'inscription',
    seance_essai: 'inscription',
    humain:       'infos_pratiques',
    autre:        'infos_pratiques',
};

function getRoute(motif) {
    const key = ROUTE_ALIASES[motif] || motif;
    return routes()[key] || routes().infos_pratiques;
}

module.exports = { routes, getMotifByDigit, getRoute, ROUTE_ALIASES };
